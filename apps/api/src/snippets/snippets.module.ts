import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { CaslModule } from "../casl/casl.module";
import { SnippetsService } from "./snippets.service";
import { SnippetsController } from "./snippets.controller";

/** Wires the snippet CRUD/search feature: controller, service, and its LLM/CASL dependencies. */
@Module({
  imports: [LlmModule, CaslModule],
  controllers: [SnippetsController],
  providers: [SnippetsService],
  exports: [SnippetsService],
})
export class SnippetsModule {}
