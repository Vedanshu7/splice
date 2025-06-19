-- Powers the live board: clients subscribe to Postgres Changes on this
-- table directly via the Supabase client, filtered by workspace_id.
alter publication supabase_realtime add table public.snippets;
