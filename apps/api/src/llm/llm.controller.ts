import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";
import { RedisService } from "../redis/redis.service";
import { LlmService } from "./llm.service";
import { ChatWithSnippetDto } from "./dto/chat.dto";

/** LLM-backed endpoints; snippet auto-tag/summary and search embedding happen inline in their own services, not here. */
@Controller("llm")
@UseGuards(SupabaseAuthGuard)
export class LlmController {
  constructor(
    private readonly llm: LlmService,
    private readonly redis: RedisService,
  ) {}

  /** Chat/explain panel for a snippet, rate-limited per user via Redis. */
  @Post("chat")
  async chat(@CurrentUser() user: AuthenticatedUser, @Body() body: ChatWithSnippetDto) {
    const { allowed, remaining } = await this.redis.checkLlmRateLimit(user.id);
    if (!allowed) {
      return { error: "rate_limited", remaining };
    }

    const result = await this.llm.chatAboutSnippet(body.snippetTitle, body.snippetContent, body.history);
    return { reply: result.text, provider: result.provider, remaining };
  }
}
