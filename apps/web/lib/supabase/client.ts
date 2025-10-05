import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Browser-side Supabase client, used in Client Components. */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
