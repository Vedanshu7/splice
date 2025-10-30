import Link from "next/link";
import type { Snippet } from "@splice/shared";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Dashboard grid card: title, language, AI summary (or a content preview), and tags. */
export function SnippetCard({ snippet }: { snippet: Snippet }) {
  return (
    <Link href={`/snippet/${snippet.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="truncate">{snippet.title}</CardTitle>
          <CardAction>
            <Badge>{snippet.language}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {snippet.aiSummary || snippet.content.slice(0, 140)}
          </p>
          {snippet.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {snippet.tags.map((tag) => (
                <Badge key={tag.id}>{tag.name}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
