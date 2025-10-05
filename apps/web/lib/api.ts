import { createClient } from "./supabase/client";
import { env } from "./env";
import type { Snippet, SnippetSearchResult, Workspace, WorkspaceMember } from "@splice/shared";

const API_URL = env.NEXT_PUBLIC_API_URL;

/** A workspace member as returned by the API, with the profile's display name joined in. */
export type WorkspaceMemberWithName = WorkspaceMember & { displayName: string | null };

async function authedFetch(path: string, init?: RequestInit) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Typed client for the NestJS API — every method attaches the current Supabase session token. */
export const api = {
  snippets: {
    list: (workspaceId?: string): Promise<Snippet[]> =>
      authedFetch(`/snippets${workspaceId ? `?workspaceId=${workspaceId}` : ""}`),
    get: (id: string): Promise<Snippet> => authedFetch(`/snippets/${id}`),
    getShared: async (slug: string): Promise<Snippet> => {
      const res = await fetch(`${API_URL}/api/snippets/shared/${slug}`);
      if (!res.ok) throw new Error("Snippet not found");
      return res.json();
    },
    create: (input: { title: string; content: string; language: string; workspaceId?: string; tags?: string[] }) =>
      authedFetch("/snippets", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, input: Partial<{ title: string; content: string; language: string; tags: string[] }>) =>
      authedFetch(`/snippets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => authedFetch(`/snippets/${id}`, { method: "DELETE" }),
    share: (id: string): Promise<{ shareSlug: string }> =>
      authedFetch(`/snippets/${id}/share`, { method: "POST" }),
  },
  search: {
    query: (q: string, mode: "fulltext" | "semantic" = "fulltext"): Promise<SnippetSearchResult[]> =>
      authedFetch(`/search?q=${encodeURIComponent(q)}&mode=${mode}`),
  },
  workspaces: {
    list: (): Promise<Workspace[]> => authedFetch("/workspaces"),
    get: (id: string): Promise<Workspace> => authedFetch(`/workspaces/${id}`),
    create: (input: { name: string; visibility: "public" | "invite_only" }) =>
      authedFetch("/workspaces", { method: "POST", body: JSON.stringify(input) }),
    join: (inviteCode: string) =>
      authedFetch("/workspaces/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),
    members: (id: string): Promise<WorkspaceMemberWithName[]> =>
      authedFetch(`/workspaces/${id}/members`),
    ping: (id: string) => authedFetch(`/workspaces/${id}/presence/ping`, { method: "POST" }),
    present: (id: string): Promise<string[]> => authedFetch(`/workspaces/${id}/presence`),
  },
  llm: {
    chat: (input: { snippetTitle: string; snippetContent: string; history: { role: string; content: string }[] }) =>
      authedFetch("/llm/chat", { method: "POST", body: JSON.stringify(input) }),
  },
  billing: {
    checkout: (): Promise<{ url: string }> => authedFetch("/stripe/checkout", { method: "POST" }),
  },
  profiles: {
    me: (): Promise<{ id: string; displayName: string | null; isPro: boolean; createdAt: string }> =>
      authedFetch("/profiles/me"),
  },
};
