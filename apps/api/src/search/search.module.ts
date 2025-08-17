import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { SnippetsModule } from "../snippets/snippets.module";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";

/** Wires full-text/semantic search: depends on LLM (embeddings) and Snippets (hydrating results). */
@Module({
  imports: [LlmModule, SnippetsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
