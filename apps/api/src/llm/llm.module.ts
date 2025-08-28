import { Module } from "@nestjs/common";
import { LlmService } from "./llm.service";
import { LlmController } from "./llm.controller";

/** Wires the provider-agnostic LLM feature: chat endpoint and the LlmService other modules inject. */
@Module({
  controllers: [LlmController],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
