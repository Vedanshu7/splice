import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { metrics } from "@opentelemetry/api";
import { createLlmProvider, LlmProviderName } from "./providers/factory";
import { ChatMessage, LlmProvider, UnsupportedOperationError } from "./providers/types";

const meter = metrics.getMeter("splice-api.llm");
const callDuration = meter.createHistogram("llm.call.duration", {
  description: "Duration of an LLM provider call",
  unit: "ms",
});
const callCount = meter.createCounter("llm.call.count", {
  description: "Number of LLM provider calls, by operation and outcome",
});

// The model's JSON reply is untrusted input, same as anything else crossing
// a network boundary: it can be malformed, missing fields, or wrong types
// even when we've asked nicely for a schema. Validate it like any other
// external payload rather than trusting `JSON.parse` + a type assertion.
const tagAndSummarizeSchema = z.object({
  // .transform() truncates rather than rejecting: a model that ignores the
  // "2-5 tags" instruction and returns 7 shouldn't discard an otherwise-good
  // summary just because of that.
  tags: z
    .array(z.string())
    .default([])
    .transform((tags) => tags.slice(0, 5)),
  summary: z.string().default(""),
});

/** Result of `LlmService.tagAndSummarize()`, validated against `tagAndSummarizeSchema`. */
export type TagAndSummarizeResult = z.infer<typeof tagAndSummarizeSchema>;

/**
 * Selects the configured chat/embedding providers (falling back to OpenAI
 * for embeddings if the primary provider can't do them) and implements the
 * three AI features on top: auto-tag/summary, search embeddings, and the
 * snippet chat/explain panel.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly generateProvider: LlmProvider;
  private readonly embedProvider: LlmProvider;

  constructor(private readonly config: ConfigService) {
    const keys = {
      openai: this.config.get<string>("OPENAI_API_KEY"),
      anthropic: this.config.get<string>("ANTHROPIC_API_KEY"),
      gemini: this.config.get<string>("GEMINI_API_KEY"),
    };

    const primary = (this.config.get<string>("LLM_PROVIDER") ?? "openai") as LlmProviderName;
    this.generateProvider = createLlmProvider(primary, keys);

    const embeddingPreference = this.config.get<string>("LLM_EMBEDDING_PROVIDER") as
      | LlmProviderName
      | undefined;
    const embedProviderName = embeddingPreference ?? primary;

    // Anthropic never throws at construction (only when embed() is actually
    // called), so a try/catch around createLlmProvider can't detect "this
    // provider type doesn't support embeddings" — it has to be checked
    // explicitly, before we ever try to use it.
    if (embedProviderName === "anthropic") {
      this.logger.warn(
        `Falling back to OpenAI for embeddings; ${embedProviderName} has no embeddings API`,
      );
      this.embedProvider = createLlmProvider("openai", keys);
    } else {
      try {
        this.embedProvider = createLlmProvider(embedProviderName, keys);
      } catch {
        this.logger.warn(
          `Falling back to OpenAI for embeddings; ${embedProviderName} is not usable for embed() (missing API key)`,
        );
        this.embedProvider = createLlmProvider("openai", keys);
      }
    }
  }

  async generate(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }) {
    const provider = this.generateProvider.name;
    const start = performance.now();
    try {
      const result = await this.generateProvider.generate({ messages, ...opts });
      this.recordLlmCall("generate", provider, start, "ok");
      return result;
    } catch (err) {
      this.recordLlmCall("generate", provider, start, "error");
      throw err;
    }
  }

  async embed(input: string[]) {
    const provider = this.embedProvider.name;
    const start = performance.now();
    try {
      const result = await this.embedProvider.embed({ input });
      this.recordLlmCall("embed", provider, start, "ok");
      return result;
    } catch (err) {
      this.recordLlmCall("embed", provider, start, "error");
      if (err instanceof UnsupportedOperationError) {
        this.logger.error(err.message);
      }
      throw err;
    }
  }

  private recordLlmCall(
    operation: "generate" | "embed",
    provider: string,
    startedAt: number,
    outcome: "ok" | "error",
  ) {
    const attributes = { operation, provider, outcome };
    callDuration.record(performance.now() - startedAt, attributes);
    callCount.add(1, attributes);
  }

  // ── Feature 1: auto-tag + summary on save ──────────────────────────
  async tagAndSummarize(title: string, content: string): Promise<TagAndSummarizeResult> {
    const { text } = await this.generate([
      {
        role: "system",
        content:
          "You label code/text snippets. Given a title and content, respond with strict JSON only: " +
          '{"tags": string[], "summary": string}. tags: 2-5 short lowercase keywords. ' +
          "summary: one plain sentence, under 120 characters. No markdown, no code fences.",
      },
      { role: "user", content: `Title: ${title}\n\nContent:\n${content.slice(0, 4000)}` },
    ]);

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.logger.warn("tagAndSummarize: model did not return valid JSON, returning empty result");
      return { tags: [], summary: "" };
    }

    const parsed = tagAndSummarizeSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(
        `tagAndSummarize: model JSON didn't match the expected shape (${parsed.error.message}), returning empty result`,
      );
      return { tags: [], summary: "" };
    }
    return parsed.data;
  }

  // ── Feature 2: natural-language search support ─────────────────────
  async embedForSearch(text: string): Promise<number[]> {
    const { embeddings } = await this.embed([text]);
    return embeddings[0];
  }

  // ── Feature 3: chat/explain panel ──────────────────────────────────
  async chatAboutSnippet(snippetTitle: string, snippetContent: string, history: ChatMessage[]) {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          `You are explaining/answering questions about this saved snippet titled "${snippetTitle}". ` +
          `Snippet content:\n${snippetContent.slice(0, 6000)}\n\n` +
          "Answer questions about it, suggest refactors when asked, and stay concise.",
      },
      ...history,
    ];
    return this.generate(messages, { maxTokens: 800 });
  }
}
