import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { subject } from "@casl/ability";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";
import { PoliciesGuard } from "../casl/policies.guard";
import { CheckPolicies } from "../casl/check-policies.decorator";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { JoinWorkspaceDto } from "./dto/join-workspace.dto";

/** Workspace CRUD, invite-code joining, membership, and live-board presence endpoints. */
@Controller("workspaces")
@UseGuards(SupabaseAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaces.findAllForUser(user.id);
  }

  // The Pro-gate for invite-only (private) workspace creation is enforced
  // here, at the request-shape level (we already know `dto.visibility`
  // before touching the database), rather than inline in the service.
  @Post()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({
    handle: (ability, request) => {
      const { visibility } = (request as { body: CreateWorkspaceDto }).body;
      return ability.can("create", subject("Workspace", { visibility }));
    },
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @Post("join")
  join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinWorkspaceDto) {
    return this.workspaces.join(user.id, dto.inviteCode);
  }

  @Get(":id/members")
  members(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.workspaces.members(id, user.id);
  }

  // Live board presence: the client calls this every ~15s while a workspace
  // is open; the actual board content updates arrive over Supabase Realtime.
  @Post(":id/presence/ping")
  ping(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.workspaces.ping(id, user.id);
  }

  @Get(":id/presence")
  present(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.workspaces.present(id, user.id);
  }
}
