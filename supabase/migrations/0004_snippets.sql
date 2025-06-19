create table public.tags (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique
);

create table public.snippets (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  workspace_id   uuid references public.workspaces (id) on delete set null,
  title          text not null,
  content        text not null,
  language       text not null default 'plaintext',
  ai_summary     text,
  share_slug     text unique,
  -- 1536 dims matches OpenAI text-embedding-3-small; swap if LLM_PROVIDER's
  -- embedding model uses a different width.
  embedding      vector(1536),
  search_vector  tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.snippet_tags (
  snippet_id  uuid not null references public.snippets (id) on delete cascade,
  tag_id      uuid not null references public.tags (id) on delete cascade,
  primary key (snippet_id, tag_id)
);

create index snippets_search_vector_idx on public.snippets using gin (search_vector);
create index snippets_embedding_idx on public.snippets using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index snippets_owner_idx on public.snippets (owner_id);
create index snippets_workspace_idx on public.snippets (workspace_id);

create trigger set_snippets_updated_at
  before update on public.snippets
  for each row execute procedure extensions.moddatetime(updated_at);

alter table public.snippets enable row level security;
alter table public.tags enable row level security;
alter table public.snippet_tags enable row level security;

create policy "owners can read their own snippets"
  on public.snippets for select
  to authenticated
  using (owner_id = auth.uid());

create policy "workspace members can read workspace snippets"
  on public.snippets for select
  to authenticated
  using (
    workspace_id is not null and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = snippets.workspace_id and m.user_id = auth.uid()
    )
  );

-- share_slug acts as a capability token: anyone with the link can read that
-- one row, anonymously, without exposing the rest of the table.
create policy "shared snippets are readable via their slug"
  on public.snippets for select
  using (share_slug is not null);

create policy "owners manage their own snippets"
  on public.snippets for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "tags are readable by anyone authenticated"
  on public.tags for select
  to authenticated
  using (true);

create policy "authenticated users can create tags"
  on public.tags for insert
  to authenticated
  with check (true);

create policy "snippet_tags follow the snippet's own visibility"
  on public.snippet_tags for select
  using (
    exists (
      select 1 from public.snippets s
      where s.id = snippet_tags.snippet_id
    )
  );

create policy "owners manage their snippet's tags"
  on public.snippet_tags for all
  to authenticated
  using (
    exists (
      select 1 from public.snippets s
      where s.id = snippet_tags.snippet_id and s.owner_id = auth.uid()
    )
  );
