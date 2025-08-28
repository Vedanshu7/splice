import { LlmProvider } from "./types";
import { OpenAiProvider } from "./openai.provider";
import { AnthropicProvider } from "./anthropic.provider";
import { GeminiProvider } from "./gemini.provider";

export type LlmProviderName = "openai" | "anthropic" | "gemini";

/** API keys for every provider the factory might need to construct. */
export interface LlmProviderKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
}

/** Constructs the adapter for the named provider; throws if its key isn't configured. */
export function createLlmProvider(name: LlmProviderName, keys: LlmProviderKeys): LlmProvider {
  switch (name) {
    case "openai": {
      if (!keys.openai) throw new Error("OPENAI_API_KEY is not set");
      return new OpenAiProvider(keys.openai);
    }
    case "anthropic": {
      if (!keys.anthropic) throw new Error("ANTHROPIC_API_KEY is not set");
      return new AnthropicProvider(keys.anthropic);
    }
    case "gemini": {
      if (!keys.gemini) throw new Error("GEMINI_API_KEY is not set");
      return new GeminiProvider(keys.gemini);
    }
  }
}
