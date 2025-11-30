import { notFound } from "next/navigation";
import type { Snippet } from "@splice/shared";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env";

async function getSharedSnippet(slug: string): Promise<Snippet | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/snippets/shared/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function SharedSnippetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snippet = await getSharedSnippet(slug);
  if (!snippet) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{snippet.title}</h1>
        <Badge>{snippet.language}</Badge>
      </div>
      {snippet.aiSummary && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {snippet.aiSummary}
        </p>
      )}
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm">
        <code>{snippet.content}</code>
      </pre>
      <p className="mt-6 text-center text-xs text-muted-foreground">Shared via Splice</p>
    </main>
  );
}
