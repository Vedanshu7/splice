export type WorkspaceRole = "admin" | "member";
export type WorkspaceVisibility = "public" | "invite_only";

/** A signed-in user's profile, as surfaced to clients (mirrors the API's `ProfilesService` DTO). */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  isPro: boolean;
  createdAt: string;
}

/** A label attachable to snippets, either user-supplied or added by the AI auto-tag feature. */
export interface Tag {
  id: string;
  name: string;
}

/** A saved snippet, including its AI-generated summary and (if shared) its public slug. */
export interface Snippet {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  title: string;
  content: string;
  language: string;
  tags: Tag[];
  aiSummary: string | null;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A shared space snippets can belong to; `invite_only` visibility is the Stripe-gated Pro feature. */
export interface Workspace {
  id: string;
  name: string;
  visibility: WorkspaceVisibility;
  inviteCode: string | null;
  ownerId: string;
  createdAt: string;
}

/** One user's membership in a workspace. */
export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

/** A single search hit: the matched snippet plus its relevance score and which search mode found it. */
export interface SnippetSearchResult {
  snippet: Snippet;
  score: number;
  matchType: "fulltext" | "semantic";
}

/** A live-board activity event, delivered over Supabase Realtime rather than this shape directly (see workspace detail page). */
export interface LiveBoardEvent {
  workspaceId: string;
  userId: string;
  snippetId: string;
  action: "viewing" | "editing" | "saved";
  at: string;
}
