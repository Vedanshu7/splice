import type { Snippet, SnippetSearchResult } from "@splice/shared";
import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

async function authedFetch(path: string, init?: RequestInit) {
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

/** Typed client for the NestJS API — the mobile-relevant subset of the web app's `api` client. */
export const api = {
  snippets: {
    list: (): Promise<Snippet[]> => authedFetch("/snippets"),
    get: (id: string): Promise<Snippet> => authedFetch(`/snippets/${id}`),
    getShared: async (slug: string): Promise<Snippet> => {
      const res = await fetch(`${API_URL}/api/snippets/shared/${slug}`);
      if (!res.ok) throw new Error("Snippet not found");
      return res.json();
    },
    create: (input: { title: string; content: string; language: string; tags?: string[] }): Promise<Snippet> =>
      authedFetch("/snippets", { method: "POST", body: JSON.stringify(input) }),
  },
  search: {
    query: (q: string, mode: "fulltext" | "semantic" = "fulltext"): Promise<SnippetSearchResult[]> =>
      authedFetch(`/search?q=${encodeURIComponent(q)}&mode=${mode}`),
  },
};
