import { ConfigService } from "@nestjs/config";
import { LlmService } from "./llm.service";
import type { GenerateResult, LlmProvider } from "./providers/types";

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function fakeGenerateResult(text: string): GenerateResult {
  return { text, provider: "fake", model: "fake-model" };
}

describe("LlmService", () => {
  describe("provider selection", () => {
    it("falls back to OpenAI for embeddings when the primary provider can't do them", () => {
      const config = makeConfig({
        LLM_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "anthropic-key",
        OPENAI_API_KEY: "openai-key",
      });
      const service = new LlmService(config);
      // @ts-expect-error -- private field, inspected directly for this test
      expect(service.embedProvider.name).toBe("openai");
      // @ts-expect-error -- private field, inspected directly for this test
      expect(service.generateProvider.name).toBe("anthropic");
    });

    it("uses the primary provider for both generate and embed when it supports both", () => {
      const config = makeConfig({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "openai-key" });
      const service = new LlmService(config);
      // @ts-expect-error -- private field
      expect(service.generateProvider.name).toBe("openai");
      // @ts-expect-error -- private field
      expect(service.embedProvider.name).toBe("openai");
    });
  });

  describe("tagAndSummarize", () => {
    function serviceWithFakeGenerate(responseText: string): LlmService {
      const service = new LlmService(makeConfig({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "k" }));
      const fakeProvider: LlmProvider = {
        name: "fake",
        generate: jest.fn().mockResolvedValue(fakeGenerateResult(responseText)),
        embed: jest.fn(),
      };
      // @ts-expect-error -- private field, swapped in for a fake to isolate this test from network calls
      service.generateProvider = fakeProvider;
      return service;
    }

    it("returns the parsed tags/summary when the model replies with valid matching JSON", async () => {
      const service = serviceWithFakeGenerate('{"tags": ["auth", "jwt"], "summary": "Verifies a JWT."}');
      const result = await service.tagAndSummarize("Auth guard", "some code");
      expect(result).toEqual({ tags: ["auth", "jwt"], summary: "Verifies a JWT." });
    });

    it("falls back to an empty result when the model reply isn't valid JSON", async () => {
      const service = serviceWithFakeGenerate("not json at all");
      const result = await service.tagAndSummarize("Title", "content");
      expect(result).toEqual({ tags: [], summary: "" });
    });

    it("falls back to an empty result when the JSON doesn't match the expected shape", async () => {
      // `tags` should be a string array; the model returned an object instead.
      const service = serviceWithFakeGenerate('{"tags": {"a": 1}, "summary": 42}');
      const result = await service.tagAndSummarize("Title", "content");
      expect(result).toEqual({ tags: [], summary: "" });
    });

    it("truncates to at most 5 tags even if the model returns more", async () => {
      const tags = ["a", "b", "c", "d", "e", "f", "g"];
      const service = serviceWithFakeGenerate(JSON.stringify({ tags, summary: "s" }));
      const result = await service.tagAndSummarize("Title", "content");
      expect(result.tags).toHaveLength(5);
    });
  });
});
