"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Chat/explain panel for a snippet detail page; sends the full thread to the LLM chat endpoint each turn. */
export function ChatPanel({ snippetTitle, snippetContent }: { snippetTitle: string; snippetContent: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await api.llm.chat({ snippetTitle, snippetContent, history: next });
      if (res.error === "rate_limited") {
        setMessages([...next, { role: "assistant", content: "You've hit the rate limit, try again in a minute." }]);
      } else {
        setMessages([...next, { role: "assistant", content: res.reply }]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border">
      <div className="border-b border-border p-3 text-sm font-medium">Ask about this snippet</div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask what this code does, why it&apos;s written this way, or how to refactor it.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={
                m.role === "user"
                  ? "inline-block rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  : "inline-block rounded-lg bg-muted px-3 py-1.5 text-sm"
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">Thinking...</p>}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send} disabled={loading}>
          Send
        </Button>
      </div>
    </div>
  );
}
