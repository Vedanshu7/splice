"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withRequireAuth } from "@/components/hoc/with-require-auth";

function NewSnippetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const snippet = await api.snippets.create({
      title,
      content,
      language,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    router.push(`/snippet/${snippet.id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">New snippet</h1>
      <div className="space-y-4">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          placeholder="Language (e.g. typescript, go, sql)"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />
        <textarea
          className="min-h-[300px] w-full rounded-md border border-border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Paste your snippet..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Input
          placeholder="Tags (comma separated, optional — AI adds more automatically)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <Button disabled={saving || !title || !content} onClick={handleSave}>
          {saving ? "Saving..." : "Save snippet"}
        </Button>
      </div>
    </main>
  );
}

export default withRequireAuth(NewSnippetPage);
