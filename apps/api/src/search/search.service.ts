import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { LlmService } from "../llm/llm.service";
import { RedisService } from "../redis/redis.service";
import { SnippetsService } from "../snippets/snippets.service";

/** Full-text and semantic search over snippets, cached in Redis and hydrated back into full `Snippet` DTOs. */
@Injectable()
export class SearchService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly llm: LlmService,
    private readonly redis: RedisService,
    private readonly snippets: SnippetsService,
  ) {}

  async search(userId: string, query: string, mode: "fulltext" | "semantic" = "fulltext") {
    const cached = await this.redis.getCachedSearch<{ snippetId: string; score: number }[]>(
      userId,
      query,
      mode,
    );
    if (cached) {
      return this.hydrate(userId, cached);
    }

    const hits =
      mode === "semantic"
        ? await this.semanticSearch(userId, query)
        : await this.fulltextSearch(userId, query);

    await this.redis.setCachedSearch(userId, query, mode, hits);
    return this.hydrate(userId, hits);
  }

  private async fulltextSearch(userId: string, query: string) {
    const { rows } = await this.pool.query<{ snippet_id: string; rank: number }>(
      `select * from public.search_snippets_fulltext($1, $2, 20)`,
      [query, userId],
    );
    return rows.map((r) => ({ snippetId: r.snippet_id, score: r.rank }));
  }

  private async semanticSearch(userId: string, query: string) {
    const embedding = await this.llm.embedForSearch(query);
    const { rows } = await this.pool.query<{ snippet_id: string; similarity: number }>(
      `select * from public.search_snippets_semantic($1, $2, 20)`,
      [`[${embedding.join(",")}]`, userId],
    );
    return rows.map((r) => ({ snippetId: r.snippet_id, score: r.similarity }));
  }

  private async hydrate(userId: string, hits: { snippetId: string; score: number }[]) {
    const results = await Promise.all(
      hits.map(async (hit) => ({
        snippet: await this.snippets.findOneOrThrow(hit.snippetId, userId),
        score: hit.score,
      })),
    );
    return results;
  }
}
