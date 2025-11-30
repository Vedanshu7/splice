import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re on Pro</h1>
      <p className="text-sm text-muted-foreground">
        The Stripe webhook updates your account moments after checkout. If workspace creation still
        says you need Pro, give it a few seconds and retry.
      </p>
      <Link href="/workspace">
        <Button>Back to workspaces</Button>
      </Link>
    </main>
  );
}
