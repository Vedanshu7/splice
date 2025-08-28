import {
  EmbedOptions,
  EmbedResult,
  GenerateOptions,
  GenerateResult,
  LlmProvider,
  UnsupportedOperationError,
} from "./types";

const CHAT_MODEL = "claude-sonnet-5";

/** Anthropic chat adapter; embed() always throws, Anthropic has no embeddings endpoint. */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";

  constructor(private readonly apiKey: string) {}

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const system = options.messages.find((m) => m.role === "system")?.content;
    const rest = options.messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        system,
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic generate failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.find((block) => block.type === "text")?.text ?? "";

    return { text, provider: this.name, model: CHAT_MODEL };
  }

  // Anthropic has no first-party embeddings endpoint. Callers should set a
  // separate LLM_EMBEDDING_PROVIDER (e.g. openai) rather than assume this works.
  async embed(_options: EmbedOptions): Promise<EmbedResult> {
    throw new UnsupportedOperationError(this.name, "embeddings");
  }
}
