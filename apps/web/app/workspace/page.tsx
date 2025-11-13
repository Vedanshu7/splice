"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Workspace } from "@splice/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withRequireAuth } from "@/components/hoc/with-require-auth";
import { withProGate } from "@/components/hoc/with-pro-gate";
import { getActiveWorkspaceId } from "@/app/actions/app-session";

function CreateWorkspaceCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    try {
      await api.workspaces.create({ name, visibility: "public" });
      setName("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={!name} onClick={handleCreate}>
          Create
        </Button>
      </CardContent>
    </Card>
  );
}

function PrivateWorkspaceCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    try {
      await api.workspaces.create({ name, visibility: "invite_only" });
      setName("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a private workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={!name} onClick={handleCreate}>
          Create private workspace
        </Button>
      </CardContent>
    </Card>
  );
}

const GatedPrivateWorkspaceCard = withProGate(PrivateWorkspaceCard);

function JoinWorkspaceCard({ onJoined }: { onJoined: () => void }) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);
    try {
      await api.workspaces.join(inviteCode);
      setInviteCode("");
      onJoined();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join with an invite code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={!inviteCode} onClick={handleJoin}>
          Join
        </Button>
      </CardContent>
    </Card>
  );
}

function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [lastWorkspaceId, setLastWorkspaceId] = useState<string | null>(null);

  function refresh() {
    api.workspaces.list().then(setWorkspaces);
  }

  useEffect(refresh, []);
  useEffect(() => {
    getActiveWorkspaceId().then((id) => setLastWorkspaceId(id ?? null));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Workspaces</h1>

      {lastWorkspaceId && (
        <Link href={`/workspace/${lastWorkspaceId}`}>
          <Card className="mb-6 flex items-center justify-between p-4">
            <span className="text-sm">Continue where you left off</span>
            <Button variant="outline">Resume</Button>
          </Card>
        </Link>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CreateWorkspaceCard onCreated={refresh} />
        <GatedPrivateWorkspaceCard onCreated={refresh} />
        <JoinWorkspaceCard onJoined={refresh} />
      </div>

      <div className="space-y-2">
        {workspaces.map((w) => (
          <Link key={w.id} href={`/workspace/${w.id}`}>
            <Card className="flex items-center justify-between p-4">
              <span className="font-medium">{w.name}</span>
              <span className="text-xs text-muted-foreground">{w.visibility}</span>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default withRequireAuth(WorkspacesPage);
