import { useAuthStore } from "./auth-store";
import type { Session, User } from "@supabase/supabase-js";

function makeSession(user: Partial<User> = {}): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "user-1", email: "test@example.com", ...user } as User,
  } as Session;
}

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it("starts loading with no user", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });

  it("derives the user from the session on setSession", () => {
    const session = makeSession();
    useAuthStore.getState().setSession(session);
    const state = useAuthStore.getState();
    expect(state.session).toBe(session);
    expect(state.user?.id).toBe("user-1");
    expect(state.isLoading).toBe(false);
  });

  it("clears user, session, and Pro status on clear()", () => {
    useAuthStore.getState().setSession(makeSession());
    useAuthStore.getState().setIsPro(true);
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isPro).toBe(false);
  });

  it("setSession(null) clears the derived user but leaves isLoading false", () => {
    useAuthStore.getState().setSession(null);
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
