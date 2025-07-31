import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisService } from "../redis/redis.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";

interface WorkspaceRow {
  id: string;
  name: string;
  visibility: "public" | "invite_only";
  invite_code: string | null;
  owner_id: string;
  created_at: string;
}

interface MemberRow {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  display_name: string | null;
}

/** A workspace as returned by the API (camelCase over the `workspaces` table). */
export interface WorkspaceDto {
  id: string;
  name: string;
  visibility: "public" | "invite_only";
  inviteCode: string | null;
  ownerId: string;
  createdAt: string;
}

/** A workspace member as returned by the API, with the profile's display name joined in. */
export interface WorkspaceMemberDto {
  workspaceId: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  displayName: string | null;
}

function toWorkspaceDto(row: WorkspaceRow): WorkspaceDto {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function toMemberDto(row: MemberRow): Omit<WorkspaceMemberDto, "workspaceId"> {
  return {
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    displayName: row.display_name,
  };
}

/** Manages workspaces: creation (Pro-gated for private ones), membership, and live-board presence. */
@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redis: RedisService,
  ) {}

  // The Pro-gate for invite-only creation lives in WorkspacesController's
  // `@CheckPolicies()` (CaslAbilityFactory), enforced before this method is
  // ever called — not duplicated here.
  /** Creates a workspace; `invite_only` visibility requires the user to be Pro (enforced by the controller guard). */
  async create(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceDto> {
    const inviteCode = dto.visibility === "invite_only" ? randomBytes(4).toString("hex") : null;

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query<{ id: string }>(
        `insert into public.workspaces (name, visibility, invite_code, owner_id)
         values ($1, $2, $3, $4) returning id`,
        [dto.name, dto.visibility, inviteCode, userId],
      );
      const workspaceId = rows[0].id;

      await client.query(
        `insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'admin')`,
        [workspaceId, userId],
      );

      await client.query("commit");
      return this.findOneOrThrow(workspaceId, userId);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Lists workspaces the user is a member of, plus every public workspace. */
  async findAllForUser(userId: string): Promise<WorkspaceDto[]> {
    const { rows } = await this.pool.query<WorkspaceRow>(
      `select w.* from public.workspaces w
       join public.workspace_members m on m.workspace_id = w.id
       where m.user_id = $1
       union
       select w.* from public.workspaces w where w.visibility = 'public'`,
      [userId],
    );
    return rows.map(toWorkspaceDto);
  }

  /** Fetches a workspace, throwing if it doesn't exist or the user isn't a member of an invite-only one. */
  async findOneOrThrow(id: string, userId: string): Promise<WorkspaceDto> {
    const { rows } = await this.pool.query<WorkspaceRow>(
      `select * from public.workspaces where id = $1`,
      [id],
    );
    const workspace = rows[0];
    if (!workspace) throw new NotFoundException("Workspace not found");

    if (workspace.visibility === "invite_only") {
      const member = await this.pool.query(
        `select 1 from public.workspace_members where workspace_id = $1 and user_id = $2`,
        [id, userId],
      );
      if (member.rowCount === 0) throw new ForbiddenException("Not a member of this workspace");
    }
    return toWorkspaceDto(workspace);
  }

  /** Joins the workspace matching the given invite code. */
  async join(userId: string, inviteCode: string): Promise<WorkspaceDto> {
    const { rows } = await this.pool.query<{ id: string }>(
      `select id from public.workspaces where invite_code = $1`,
      [inviteCode],
    );
    const workspace = rows[0];
    if (!workspace) throw new NotFoundException("Invalid invite code");

    await this.pool.query(
      `insert into public.workspace_members (workspace_id, user_id, role)
       values ($1, $2, 'member') on conflict do nothing`,
      [workspace.id, userId],
    );
    return this.findOneOrThrow(workspace.id, userId);
  }

  /** Lists a workspace's members with their display name and role. */
  async members(workspaceId: string, userId: string): Promise<WorkspaceMemberDto[]> {
    await this.findOneOrThrow(workspaceId, userId);
    const { rows } = await this.pool.query<MemberRow>(
      `select m.user_id, m.role, m.joined_at, p.display_name
       from public.workspace_members m
       join public.profiles p on p.id = m.user_id
       where m.workspace_id = $1`,
      [workspaceId],
    );
    return rows.map((row) => ({ ...toMemberDto(row), workspaceId }));
  }

  // ── Live board presence (Redis-backed, alongside Supabase Realtime) ──
  async ping(workspaceId: string, userId: string) {
    await this.findOneOrThrow(workspaceId, userId);
    await this.redis.markPresent(workspaceId, userId);
    return { ok: true };
  }

  async present(workspaceId: string, userId: string) {
    await this.findOneOrThrow(workspaceId, userId);
    return this.redis.listPresent(workspaceId);
  }
}
