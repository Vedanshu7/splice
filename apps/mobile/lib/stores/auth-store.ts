import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  /** True while the initial session check is still in flight. */
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  clear: () => void;
}

/**
 * Single source of truth for "who is signed in" on mobile, mirroring the web
 * app's store. Populated once at the root layout via
 * `supabase.auth.onAuthStateChange`; screens read from here instead of each
 * calling `supabase.auth.getSession()` individually.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, isLoading: false }),
  clear: () => set({ session: null, user: null, isLoading: false }),
}));
