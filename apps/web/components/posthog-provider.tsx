"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { env } from "@/lib/env";

if (typeof window !== "undefined" && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    // App Router navigations are client-side, so PostHog's automatic
    // pageview capture (which hooks history.pushState) misses them; we
    // capture pageviews manually in PostHogPageView below instead.
    capture_pageview: false,
    person_profiles: "identified_only",
  });
}

/** Fires a $pageview event on every App Router navigation (initial load and client-side route changes alike). */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const url = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/** Wraps the app with PostHog, providing `usePostHog()` and automatic pageview tracking. No-ops entirely if unconfigured. */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
