import { IsIn, IsOptional, IsString } from "class-validator";

export class SearchQueryDto {
  @IsString()
  q!: string;

  // "fulltext" = classic keyword search (tsvector); "semantic" = natural
  // language search over embeddings (pgvector cosine similarity).
  @IsOptional()
  @IsIn(["fulltext", "semantic"])
  mode?: "fulltext" | "semantic";
}
