import {
  EmbedOptions,
  EmbedResult,
  GenerateOptions,
  GenerateResult,
  LlmProvider,
} from "./types";

const CHAT_MODEL = "gemini-2.0-flash";
const EMBEDDING_MODEL = "text-embedding-004";

/** Gemini chat/embedding adapter, implemented directly against Google's Generative Language REST API. */
export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";

  constructor(private readonly apiKey: string) {}

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const system = options.messages.find((m) => m.role === "system")?.content;
    const rest = options.messages.filter((m) => m.role !== "system");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: rest.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: options.maxTokens ?? 512,
            temperature: options.temperature ?? 0.3,
          },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    const text = data.candidates[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

    return { text, provider: this.name, model: CHAT_MODEL };
  }

  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: options.input.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
          })),
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { embeddings: { values: number[] }[] };

    return {
      embeddings: data.embeddings.map((e) => e.values),
      provider: this.name,
      model: EMBEDDING_MODEL,
    };
  }
}
