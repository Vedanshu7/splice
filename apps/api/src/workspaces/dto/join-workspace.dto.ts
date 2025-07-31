import { IsString } from "class-validator";

export class JoinWorkspaceDto {
  @IsString()
  inviteCode!: string;
}
