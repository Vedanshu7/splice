import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

/**
 * Small app-context cookie, sealed separately from Supabase's own auth
 * cookie. This is NOT an auth mechanism — Supabase remains the only source
 * of identity truth. It just remembers UI-level state (which workspace you
 * were last in) across visits.
 */
export interface AppSessionData {
  activeWorkspaceId?: string;
}

const sessionOptions = {
  cookieName: "splice_app_session",
  password: process.env.APP_SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getAppSession(): Promise<IronSession<AppSessionData>> {
  return getIronSession<AppSessionData>(await cookies(), sessionOptions);
}
