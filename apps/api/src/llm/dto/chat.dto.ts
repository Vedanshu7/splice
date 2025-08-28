import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ChatMessageDto {
  @IsIn(["system", "user", "assistant"])
  role!: "system" | "user" | "assistant";

  @IsString()
  content!: string;
}

export class ChatWithSnippetDto {
  @IsString()
  snippetTitle!: string;

  @IsString()
  snippetContent!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history!: ChatMessageDto[];
}
