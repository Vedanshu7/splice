"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type WorkspaceMemberWithName } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withRequireAuth } from "@/components/hoc/with-require-auth";
import { setActiveWorkspace } from "@/app/actions/app-session";

interface BoardEvent {
  id: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  title: string;
  at: string;
}

function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<WorkspaceMemberWithName[]>([]);
  const [present, setPresent] = useState<string[]>([]);
  const [events, setEvents] = useState<BoardEvent[]>([]);

  // Remember this as the last-visited workspace (iron-session-backed cookie,
  // separate from Supabase auth) so the workspace list can offer to jump back in.
  useEffect(() => {
    setActiveWorkspace(id).catch(() => {});
  }, [id]);

  // Presence: ping our own API (Redis-backed) every 15s, poll who else is here.
  useEffect(() => {
    api.workspaces.members(id).then(setMembers);

    const ping = () => api.workspaces.ping(id).catch(() => {});
    const poll = () => api.workspaces.present(id).then(setPresent).catch(() => {});

    ping();
    poll();
    const pingInterval = setInterval(ping, 15_000);
    const pollInterval = setInterval(poll, 10_000);
    return () => {
      clearInterval(pingInterval);
      clearInterval(pollInterval);
    };
  }, [id]);

  // Live board: subscribe directly to Supabase Realtime Postgres Changes,
  // this does not go through our own API (see plan: Realtime stays client-direct).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`workspace:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "snippets", filter: `workspace_id=eq.${id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { id: string; title: string };
          setEvents((prev) =>
            [
              { id: row.id, eventType: payload.eventType as BoardEvent["eventType"], title: row.title, at: new Date().toISOString() },
              ...prev,
            ].slice(0, 20),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[1fr_260px]">
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Live board</h1>
        <div className="space-y-2">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No activity yet. Create or edit a snippet in this workspace to see it appear here in real time.
            </p>
          )}
          {events.map((e, i) => (
            <Card key={`${e.id}-${i}`} className="flex items-center justify-between p-3">
              <span className="text-sm">{e.title}</span>
              <Badge>{e.eventType}</Badge>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm">
                <span>{m.displayName ?? m.userId.slice(0, 8)}</span>
                {present.includes(m.userId) && (
                  <span className="h-2 w-2 rounded-full bg-green-500" title="Online" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default withRequireAuth(WorkspaceDetailPage);
