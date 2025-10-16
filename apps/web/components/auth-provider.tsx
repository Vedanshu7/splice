"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { api } from "@/lib/api";
import type { User } from "@supabase/supabase-js";

function identify(user: User) {
  posthog.identify(user.id, { email: user.email });
}

/**
 * Mounted once at the root layout. Subscribes to Supabase's auth state and
 * keeps `useAuthStore` (and the derived Pro status) in sync, so the rest of
 * the app never talks to Supabase directly for "who's signed in." Also
 * links that identity to PostHog, so product analytics can be traced back
 * to a specific user rather than staying anonymous-only.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setIsPro = useAuthStore((s) => s.setIsPro);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        identify(session.user);
        api.profiles.me().then((p) => setIsPro(p.isPro)).catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        identify(session.user);
        api.profiles.me().then((p) => setIsPro(p.isPro)).catch(() => {});
      } else {
        clear();
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setIsPro, clear]);

  return <>{children}</>;
}
