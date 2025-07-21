import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

export interface Profile {
  id: string;
  displayName: string | null;
  isPro: boolean;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  is_pro: boolean;
  created_at: string;
}

function toProfileDto(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    isPro: row.is_pro,
    createdAt: row.created_at,
  };
}

/**
 * Single source of truth for profile/Pro-status lookups. Centralizing this
 * means `WorkspacesService`, `CaslAbilityFactory`, etc. all read the same
 * value the same way instead of each running its own ad hoc query.
 */
@Injectable()
export class ProfilesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Fetches a user's profile, or `null` if the profile row doesn't exist (shouldn't happen post-signup). */
  async findById(userId: string): Promise<Profile | null> {
    const { rows } = await this.pool.query<ProfileRow>(
      `select id, display_name, is_pro, created_at from public.profiles where id = $1`,
      [userId],
    );
    return rows[0] ? toProfileDto(rows[0]) : null;
  }

  /** Convenience accessor for the one field most callers actually need. */
  async isPro(userId: string): Promise<boolean> {
    const profile = await this.findById(userId);
    return profile?.isPro ?? false;
  }
}
