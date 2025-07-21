import { Controller, Get, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";
import { ProfilesService } from "./profiles.service";

@Controller("profiles")
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  /** Returns the signed-in user's own profile (id, display name, Pro status). */
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.profiles.findById(user.id);
  }
}
