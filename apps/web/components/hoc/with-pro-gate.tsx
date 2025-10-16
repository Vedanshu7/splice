"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Wraps a component that requires Pro, showing an upsell card instead of
 * rendering it otherwise. A HOC alongside `withRequireAuth` for the same
 * reason: identical gate-and-upsell behavior reused wherever a Pro-only
 * feature (currently: private workspace creation) is offered.
 */
export function withProGate<P extends object>(Component: React.ComponentType<P>) {
  function ProGate(props: P) {
    const isPro = useAuthStore((s) => s.isPro);

    if (!isPro) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>This is a Pro feature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Private, invite-only workspaces require a Splice Pro subscription.
            </p>
            <Link href="/billing">
              <Button>Upgrade</Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return <Component {...props} />;
  }

  ProGate.displayName = `withProGate(${Component.displayName ?? Component.name ?? "Component"})`;
  return ProGate;
}
