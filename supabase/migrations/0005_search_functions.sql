-- Full-text search, ranked by ts_rank against the generated search_vector.
create or replace function public.search_snippets_fulltext(
  query text,
  requesting_user uuid,
  match_limit int default 20
)
returns table (snippet_id uuid, rank real)
language sql stable
as $$
  select s.id, ts_rank(s.search_vector, websearch_to_tsquery('english', query)) as rank
  from public.snippets s
  where s.search_vector @@ websearch_to_tsquery('english', query)
    and (
      s.owner_id = requesting_user
      or s.share_slug is not null
      or exists (
        select 1 from public.workspace_members m
        where m.workspace_id = s.workspace_id and m.user_id = requesting_user
      )
    )
  order by rank desc
  limit match_limit;
$$;

-- Semantic search over the pgvector embedding column, cosine distance.
create or replace function public.search_snippets_semantic(
  query_embedding vector(1536),
  requesting_user uuid,
  match_limit int default 20
)
returns table (snippet_id uuid, similarity real)
language sql stable
as $$
  select s.id, 1 - (s.embedding <=> query_embedding) as similarity
  from public.snippets s
  where s.embedding is not null
    and (
      s.owner_id = requesting_user
      or s.share_slug is not null
      or exists (
        select 1 from public.workspace_members m
        where m.workspace_id = s.workspace_id and m.user_id = requesting_user
      )
    )
  order by s.embedding <=> query_embedding
  limit match_limit;
$$;
