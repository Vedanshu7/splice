import { useAuthStore } from "./auth-store";
import type { Session, User } from "@supabase/supabase-js";

function makeSession(): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "user-1", email: "test@example.com" } as User,
  } as Session;
}

describe("useAuthStore (mobile)", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it("starts with no user", () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("derives the user from the session on setSession", () => {
    useAuthStore.getState().setSession(makeSession());
    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("user-1");
    expect(state.isLoading).toBe(false);
  });

  it("clears user and session on clear()", () => {
    useAuthStore.getState().setSession(makeSession());
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });
});
