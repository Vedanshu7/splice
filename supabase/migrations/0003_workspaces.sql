create type public.workspace_visibility as enum ('public', 'invite_only');
create type public.workspace_role as enum ('admin', 'member');

create table public.workspaces (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  visibility    public.workspace_visibility not null default 'invite_only',
  invite_code   text unique,
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  -- invite_only workspaces are Pro-gated; enforced in the API layer at creation time,
  -- not re-derived here to keep this table a plain source of truth.
  created_at    timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          public.workspace_role not null default 'member',
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "public workspaces are readable by anyone"
  on public.workspaces for select
  using (visibility = 'public');

create policy "members can read their own workspace"
  on public.workspaces for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = id and m.user_id = auth.uid()
    )
  );

create policy "authenticated users can create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "admins can update or delete their workspace"
  on public.workspaces for update
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = id and m.user_id = auth.uid() and m.role = 'admin'
    )
  );

create policy "workspace members are readable by other members"
  on public.workspace_members for select
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_members.workspace_id and m.user_id = auth.uid()
    )
  );

create policy "admins manage membership"
  on public.workspace_members for all
  to authenticated
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_members.workspace_id
        and m.user_id = auth.uid() and m.role = 'admin'
    )
  );
