import { Inject, Injectable } from "@nestjs/common";
import { AbilityBuilder, createMongoAbility, ForcedSubject, MongoAbility } from "@casl/ability";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { ProfilesService } from "../profiles/profiles.service";

export type Action = "manage" | "create" | "read" | "update" | "delete";

/**
 * The subset of Workspace fields CASL rules are conditioned on. `id`/`ownerId`
 * are optional because the "can create" check runs before a workspace (and
 * therefore an id/owner) exists — only `visibility` is known at that point.
 */
export interface WorkspaceSubjectShape {
  id?: string;
  visibility: "public" | "invite_only";
  ownerId?: string;
}

/** The subset of Snippet fields CASL rules are conditioned on. */
export interface SnippetSubjectShape {
  ownerId: string;
  shareSlug: string | null;
  workspaceId: string | null;
}

// Tagging each shape with `ForcedSubject` is what lets `can(action, "Workspace", { ... })`
// type-check field conditions against `WorkspaceSubjectShape` — it mirrors exactly what
// the `subject("Workspace", value)` helper attaches to a value at runtime.
type AppSubjects =
  | (WorkspaceSubjectShape & ForcedSubject<"Workspace">)
  | (SnippetSubjectShape & ForcedSubject<"Snippet">)
  | "Workspace"
  | "Snippet";

export type AppAbility = MongoAbility<[Action, AppSubjects]>;

/**
 * Builds a per-request CASL ability describing what a user can do across the
 * multi-tenant boundary (workspaces): Pro-gated private workspace creation,
 * workspace-membership-scoped reads, and full owner control over snippets.
 * This is the one place those rules live, instead of scattered role/Pro
 * checks across services.
 */
@Injectable()
export class CaslAbilityFactory {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly profiles: ProfilesService,
  ) {}

  async createForUser(userId: string): Promise<AppAbility> {
    const [isPro, memberWorkspaceIds] = await Promise.all([
      this.profiles.isPro(userId),
      this.memberWorkspaceIds(userId),
    ]);

    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Workspaces: anyone can create/read public ones; invite-only (private)
    // creation is the Pro-gated feature; reading a private one requires
    // membership.
    can("create", "Workspace", { visibility: "public" });
    if (isPro) {
      can("create", "Workspace", { visibility: "invite_only" });
    }
    can("read", "Workspace", { visibility: "public" });
    can("read", "Workspace", { id: { $in: memberWorkspaceIds } });
    can(["update", "delete"], "Workspace", { ownerId: userId });

    // Snippets: owners have full control; everyone else can only read,
    // and only via a public share link or shared workspace membership.
    can("manage", "Snippet", { ownerId: userId });
    can("read", "Snippet", { shareSlug: { $ne: null } });
    can("read", "Snippet", { workspaceId: { $in: memberWorkspaceIds } });

    return build();
  }

  private async memberWorkspaceIds(userId: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ workspace_id: string }>(
      `select workspace_id from public.workspace_members where user_id = $1`,
      [userId],
    );
    return rows.map((r) => r.workspace_id);
  }
}
