"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SnippetCard } from "@/components/snippet-card";
import { withRequireAuth } from "@/components/hoc/with-require-auth";
import { useSnippetsStore } from "@/lib/stores/snippets-store";

function DashboardPage() {
  const { snippets, query, mode, isLoading, setQuery, setMode, fetchAll, runSearch } =
    useSnippetsStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your snippets</h1>
        <div className="flex gap-2">
          <Link href="/workspace">
            <Button variant="outline">Workspaces</Button>
          </Link>
          <Link href="/snippet/new">
            <Button>New snippet</Button>
          </Link>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="mb-6 flex gap-2"
      >
        <Input
          placeholder={
            mode === "semantic" ? "Describe what you're looking for..." : "Search by keyword..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          type="button"
          variant={mode === "fulltext" ? "default" : "outline"}
          onClick={() => setMode("fulltext")}
        >
          Keyword
        </Button>
        <Button
          type="button"
          variant={mode === "semantic" ? "default" : "outline"}
          onClick={() => setMode("semantic")}
        >
          Natural language
        </Button>
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : snippets.length === 0 ? (
        <p className="text-muted-foreground">No snippets yet. Create your first one.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snippets.map((s) => (
            <SnippetCard key={s.id} snippet={s} />
          ))}
        </div>
      )}
    </main>
  );
}

export default withRequireAuth(DashboardPage);
