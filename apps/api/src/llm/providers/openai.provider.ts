import {
  EmbedOptions,
  EmbedResult,
  GenerateOptions,
  GenerateResult,
  LlmProvider,
} from "./types";

const CHAT_MODEL = "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";

/** OpenAI chat/embedding adapter, implemented directly against OpenAI's REST API. */
export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";

  constructor(private readonly apiKey: string) {}

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI generate failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };

    return { text: data.choices[0]?.message?.content ?? "", provider: this.name, model: CHAT_MODEL };
  }

  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: options.input }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI embed failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { data: { embedding: number[] }[] };

    return {
      embeddings: data.data.map((d) => d.embedding),
      provider: this.name,
      model: EMBEDDING_MODEL,
    };
  }
}
