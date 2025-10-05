import { create } from "zustand";
import type { Snippet } from "@splice/shared";
import { api } from "@/lib/api";

type SearchMode = "fulltext" | "semantic";

interface SnippetsState {
  snippets: Snippet[];
  query: string;
  mode: SearchMode;
  isLoading: boolean;
  setQuery: (query: string) => void;
  setMode: (mode: SearchMode) => void;
  /** Loads the user's full snippet list, clearing any active search. */
  fetchAll: () => Promise<void>;
  /** Runs the current query in the current mode; falls back to `fetchAll` for an empty query. */
  runSearch: () => Promise<void>;
}

/**
 * Dashboard search/list state. Lives here (not local `useState`) so other
 * parts of the UI — e.g. a future global search box — can read/trigger it
 * without prop-drilling through the dashboard page.
 */
export const useSnippetsStore = create<SnippetsState>((set, get) => ({
  snippets: [],
  query: "",
  mode: "fulltext",
  isLoading: false,
  setQuery: (query) => set({ query }),
  setMode: (mode) => set({ mode }),
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const snippets = await api.snippets.list();
      set({ snippets, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  runSearch: async () => {
    const { query, mode, fetchAll } = get();
    if (!query.trim()) return fetchAll();

    set({ isLoading: true });
    try {
      const results = await api.search.query(query, mode);
      set({ snippets: results.map((r) => r.snippet), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
