"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Wraps a client page that requires a signed-in user, redirecting to
 * `/login` if there isn't one. A HOC (not a hook) because the redirect
 * behavior is identical across every page that needs it (dashboard,
 * workspace, snippet pages) — a hook would still require each page to
 * remember to call it and handle the loading/redirect render states itself.
 */
export function withRequireAuth<P extends object>(Component: React.ComponentType<P>) {
  function RequireAuth(props: P) {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const isLoading = useAuthStore((s) => s.isLoading);

    useEffect(() => {
      if (!isLoading && !user) router.replace("/login");
    }, [isLoading, user, router]);

    if (isLoading || !user) return null;
    return <Component {...props} />;
  }

  RequireAuth.displayName = `withRequireAuth(${Component.displayName ?? Component.name ?? "Component"})`;
  return RequireAuth;
}
