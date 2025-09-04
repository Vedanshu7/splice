import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { REDIS_CLIENT } from "./redis.module";

const SEARCH_CACHE_TTL_SECONDS = 60;
const LLM_RATE_LIMIT_WINDOW_SECONDS = 60;
const LLM_RATE_LIMIT_MAX_CALLS = 20;
const PRESENCE_TTL_SECONDS = 30;

/** Three unrelated Redis-backed concerns sharing one client: search-result caching, LLM rate limiting, and live-board presence. */
@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ── Search result caching ─────────────────────────────────────────
  private searchCacheKey(userId: string, query: string, mode: "fulltext" | "semantic") {
    return `search:${mode}:${userId}:${query.trim().toLowerCase()}`;
  }

  async getCachedSearch<T>(userId: string, query: string, mode: "fulltext" | "semantic") {
    return this.redis.get<T>(this.searchCacheKey(userId, query, mode));
  }

  async setCachedSearch<T>(userId: string, query: string, mode: "fulltext" | "semantic", value: T) {
    await this.redis.set(this.searchCacheKey(userId, query, mode), value, {
      ex: SEARCH_CACHE_TTL_SECONDS,
    });
  }

  // ── LLM rate limiting ─────────────────────────────────────────────
  async checkLlmRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:llm:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, LLM_RATE_LIMIT_WINDOW_SECONDS);
    }
    return { allowed: count <= LLM_RATE_LIMIT_MAX_CALLS, remaining: Math.max(0, LLM_RATE_LIMIT_MAX_CALLS - count) };
  }

  // ── Live board presence ───────────────────────────────────────────
  private presenceKey(workspaceId: string) {
    return `presence:workspace:${workspaceId}`;
  }

  async markPresent(workspaceId: string, userId: string) {
    const key = this.presenceKey(workspaceId);
    await this.redis.hset(key, { [userId]: Date.now().toString() });
    await this.redis.expire(key, PRESENCE_TTL_SECONDS);
  }

  async listPresent(workspaceId: string): Promise<string[]> {
    const entries = await this.redis.hgetall<Record<string, string>>(this.presenceKey(workspaceId));
    if (!entries) return [];
    const cutoff = Date.now() - PRESENCE_TTL_SECONDS * 1000;
    return Object.entries(entries)
      .filter(([, ts]) => Number(ts) >= cutoff)
      .map(([userId]) => userId);
  }
}
