export type ChatRole = "system" | "user" | "assistant";

/** One message in a `generate()` conversation. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Input to `LlmProvider.generate()`. */
export interface GenerateOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** Output of `LlmProvider.generate()`, tagged with which provider/model produced it. */
export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
}

/** Input to `LlmProvider.embed()` — one or more texts to embed in a single call. */
export interface EmbedOptions {
  input: string[];
}

/** Output of `LlmProvider.embed()`, one vector per input string, in order. */
export interface EmbedResult {
  embeddings: number[][];
  provider: string;
  model: string;
}

/**
 * The one interface every provider adapter implements. Callers (`LlmService`,
 * and everything built on it) only ever talk to this, never to a specific
 * vendor SDK, so swapping OpenAI/Anthropic/Gemini is an env var change, not a
 * code change. This is the same idea as the `llmbridge` Go project, ported.
 */
export interface LlmProvider {
  readonly name: string;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  // Not every provider offers embeddings (Anthropic doesn't); those adapters
  // should throw a clear UnsupportedOperationError rather than silently no-op.
  embed(options: EmbedOptions): Promise<EmbedResult>;
}

/** Thrown by a provider adapter when asked to do something it doesn't support (e.g. Anthropic + embed()). */
export class UnsupportedOperationError extends Error {
  constructor(provider: string, operation: string) {
    super(`${provider} does not support ${operation}; configure a different provider for it`);
    this.name = "UnsupportedOperationError";
  }
}
