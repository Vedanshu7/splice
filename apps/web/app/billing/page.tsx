"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const { url } = await api.billing.checkout();
    window.location.href = url;
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Splice Pro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Private, invite-only workspaces for teams. Everything else on Splice stays free.
          </p>
          <Button className="w-full" disabled={loading} onClick={handleUpgrade}>
            {loading ? "Redirecting..." : "Upgrade with Stripe"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
