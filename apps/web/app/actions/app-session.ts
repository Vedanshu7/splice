"use server";

import { getAppSession } from "@/lib/app-session";

/** Remembers the workspace the user last opened, so we can offer to jump back in. */
export async function setActiveWorkspace(workspaceId: string): Promise<void> {
  const session = await getAppSession();
  session.activeWorkspaceId = workspaceId;
  await session.save();
}

/** Reads back the last-remembered active workspace, if any. */
export async function getActiveWorkspaceId(): Promise<string | undefined> {
  const session = await getAppSession();
  return session.activeWorkspaceId;
}
