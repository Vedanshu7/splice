import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { Pool, PoolClient } from "pg";
import { Inject } from "@nestjs/common";
import { subject } from "@casl/ability";
import { PG_POOL } from "../database/database.module";
import { LlmService } from "../llm/llm.service";
import { CaslAbilityFactory } from "../casl/ability.factory";
import { CreateSnippetDto } from "./dto/create-snippet.dto";
import { UpdateSnippetDto } from "./dto/update-snippet.dto";

interface SnippetRow {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  title: string;
  content: string;
  language: string;
  ai_summary: string | null;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string }[] | null;
}

const SNIPPET_SELECT = `
  select
    s.id, s.owner_id, s.workspace_id, s.title, s.content, s.language,
    s.ai_summary, s.share_slug, s.created_at, s.updated_at,
    coalesce(
      json_agg(json_build_object('id', t.id, 'name', t.name))
        filter (where t.id is not null),
      '[]'
    ) as tags
  from public.snippets s
  left join public.snippet_tags st on st.snippet_id = s.id
  left join public.tags t on t.id = st.tag_id
`;

function toDto(row: SnippetRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    title: row.title,
    content: row.content,
    language: row.language,
    aiSummary: row.ai_summary,
    shareSlug: row.share_slug,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class SnippetsService {
  private readonly logger = new Logger(SnippetsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly llm: LlmService,
    private readonly caslFactory: CaslAbilityFactory,
  ) {}

  private async upsertTags(client: Pool | PoolClient, names: string[]): Promise<string[]> {
    const unique = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
    if (unique.length === 0) return [];

    const { rows } = await client.query<{ id: string }>(
      `insert into public.tags (name)
       select unnest($1::text[])
       on conflict (name) do update set name = excluded.name
       returning id`,
      [unique],
    );
    return rows.map((r) => r.id);
  }

  private async embeddingFor(title: string, content: string): Promise<number[] | null> {
    try {
      return await this.llm.embedForSearch(`${title}\n\n${content}`);
    } catch (err) {
      this.logger.warn(`Skipping embedding for snippet (LLM embed failed): ${(err as Error).message}`);
      return null;
    }
  }

  async create(userId: string, dto: CreateSnippetDto) {
    const { tags: aiTags, summary } = await this.tryTagAndSummarize(dto.title, dto.content);
    const embedding = await this.embeddingFor(dto.title, dto.content);
    const allTags = [...(dto.tags ?? []), ...aiTags];

    const client = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<{ id: string }>(
        `insert into public.snippets (owner_id, workspace_id, title, content, language, ai_summary, embedding)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [
          userId,
          dto.workspaceId ?? null,
          dto.title,
          dto.content,
          dto.language,
          summary || null,
          embedding ? `[${embedding.join(",")}]` : null,
        ],
      );
      const snippetId = rows[0].id;

      const tagIds = await this.upsertTags(client, allTags);
      for (const tagId of tagIds) {
        await client.query(
          `insert into public.snippet_tags (snippet_id, tag_id) values ($1, $2) on conflict do nothing`,
          [snippetId, tagId],
        );
      }

      await client.query("commit");
      return this.findOneOrThrow(snippetId, userId);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  private async tryTagAndSummarize(title: string, content: string) {
    try {
      return await this.llm.tagAndSummarize(title, content);
    } catch (err) {
      this.logger.warn(`Skipping auto-tag/summary (LLM generate failed): ${(err as Error).message}`);
      return { tags: [] as string[], summary: "" };
    }
  }

  async findAllForUser(userId: string, workspaceId?: string) {
    const { rows } = await this.pool.query<SnippetRow>(
      `${SNIPPET_SELECT}
       where (s.owner_id = $1 or s.workspace_id in (
         select workspace_id from public.workspace_members where user_id = $1
       ))
       and ($2::uuid is null or s.workspace_id = $2)
       group by s.id
       order by s.updated_at desc`,
      [userId, workspaceId ?? null],
    );
    return rows.map(toDto);
  }

  /** Fetches a snippet, enforcing read access via CASL: owner, public share link, or shared workspace membership. */
  async findOneOrThrow(id: string, userId: string) {
    const { rows } = await this.pool.query<SnippetRow>(
      `${SNIPPET_SELECT} where s.id = $1 group by s.id`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException("Snippet not found");

    const dto = toDto(row);
    const ability = await this.caslFactory.createForUser(userId);
    if (ability.cannot("read", subject("Snippet", dto))) {
      throw new ForbiddenException("Not allowed to view this snippet");
    }

    return dto;
  }

  async findByShareSlug(slug: string) {
    const { rows } = await this.pool.query<SnippetRow>(
      `${SNIPPET_SELECT} where s.share_slug = $1 group by s.id`,
      [slug],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException("Shared snippet not found");
    return toDto(row);
  }

  async update(id: string, userId: string, dto: UpdateSnippetDto) {
    const existing = await this.findOneOrThrow(id, userId);
    const ability = await this.caslFactory.createForUser(userId);
    if (ability.cannot("update", subject("Snippet", existing))) {
      throw new ForbiddenException("Only the owner can update this snippet");
    }

    const title = dto.title ?? existing.title;
    const content = dto.content ?? existing.content;
    const language = dto.language ?? existing.language;

    const contentChanged = dto.title !== undefined || dto.content !== undefined;
    const embedding = contentChanged ? await this.embeddingFor(title, content) : null;
    const { summary } = contentChanged
      ? await this.tryTagAndSummarize(title, content)
      : { summary: existing.aiSummary ?? "" };

    await this.pool.query(
      `update public.snippets
       set title = $1, content = $2, language = $3, ai_summary = $4,
           embedding = coalesce($5, embedding)
       where id = $6`,
      [title, content, language, summary || null, embedding ? `[${embedding.join(",")}]` : null, id],
    );

    if (dto.tags) {
      await this.pool.query(`delete from public.snippet_tags where snippet_id = $1`, [id]);
      const tagIds = await this.upsertTags(this.pool, dto.tags);
      for (const tagId of tagIds) {
        await this.pool.query(
          `insert into public.snippet_tags (snippet_id, tag_id) values ($1, $2) on conflict do nothing`,
          [id, tagId],
        );
      }
    }

    return this.findOneOrThrow(id, userId);
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOneOrThrow(id, userId);
    const ability = await this.caslFactory.createForUser(userId);
    if (ability.cannot("delete", subject("Snippet", existing))) {
      throw new ForbiddenException("Only the owner can delete this snippet");
    }
    await this.pool.query(`delete from public.snippets where id = $1`, [id]);
  }

  async createShareLink(id: string, userId: string) {
    const existing = await this.findOneOrThrow(id, userId);
    const ability = await this.caslFactory.createForUser(userId);
    if (ability.cannot("update", subject("Snippet", existing))) {
      throw new ForbiddenException("Only the owner can share this snippet");
    }
    const slug = existing.shareSlug ?? randomBytes(6).toString("hex");
    await this.pool.query(`update public.snippets set share_slug = $1 where id = $2`, [slug, id]);
    return { shareSlug: slug };
  }
}
