"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Snippet } from "@splice/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/chat-panel";
import { withRequireAuth } from "@/components/hoc/with-require-auth";

function SnippetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    api.snippets.get(id).then(setSnippet);
  }, [id]);

  async function handleShare() {
    const { shareSlug } = await api.snippets.share(id);
    setShareUrl(`${window.location.origin}/s/${shareSlug}`);
  }

  if (!snippet) return <main className="p-10 text-muted-foreground">Loading...</main>;

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{snippet.title}</h1>
          <div className="flex items-center gap-2">
            <Badge>{snippet.language}</Badge>
            <Button variant="outline" onClick={handleShare}>
              Share
            </Button>
          </div>
        </div>

        {snippet.aiSummary && (
          <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {snippet.aiSummary}
          </p>
        )}

        {shareUrl && (
          <p className="mb-4 text-sm">
            Public link: <a className="underline" href={shareUrl}>{shareUrl}</a>
          </p>
        )}

        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm">
          <code>{snippet.content}</code>
        </pre>

        {snippet.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {snippet.tags.map((tag) => (
              <Badge key={tag.id}>{tag.name}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="h-[500px]">
        <ChatPanel snippetTitle={snippet.title} snippetContent={snippet.content} />
      </div>
    </main>
  );
}

export default withRequireAuth(SnippetDetailPage);
