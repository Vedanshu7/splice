import { IsIn, IsString } from "class-validator";

export class CreateWorkspaceDto {
  @IsString()
  name!: string;

  @IsIn(["public", "invite_only"])
  visibility!: "public" | "invite_only";
}
