import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isPro: boolean;
  /** True while the initial session check is still in flight. */
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setIsPro: (isPro: boolean) => void;
  clear: () => void;
}

/**
 * Single source of truth for "who is signed in / are they Pro" on the
 * client. Populated by `AuthProvider`'s `supabase.auth.onAuthStateChange`
 * listener; components read from here instead of each calling
 * `supabase.auth.getSession()` individually.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isPro: false,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, isLoading: false }),
  setIsPro: (isPro) => set({ isPro }),
  clear: () => set({ session: null, user: null, isPro: false, isLoading: false }),
}));
