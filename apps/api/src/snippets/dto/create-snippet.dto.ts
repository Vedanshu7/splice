import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSnippetDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  language!: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
