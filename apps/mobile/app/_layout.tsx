import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth-store";
import { PostHogProvider } from "@/components/PostHogProvider";

/** Keeps the auth store in sync with Supabase and links the signed-in identity to PostHog. */
function AuthSync() {
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const posthog = usePostHog();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) posthog?.identify(session.user.id, { email: session.user.email ?? null });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        posthog?.identify(session.user.id, { email: session.user.email ?? null });
      } else {
        clear();
        posthog?.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, clear, posthog]);

  return null;
}

export default function RootLayout() {
  return (
    <PostHogProvider>
      <AuthSync />
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f111a" },
          headerTintColor: "#eeffff",
          contentStyle: { backgroundColor: "#0b0d13" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Splice" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="snippet/new" options={{ title: "New snippet" }} />
        <Stack.Screen name="snippet/[id]" options={{ title: "Snippet" }} />
        <Stack.Screen name="s/[slug]" options={{ title: "Shared snippet" }} />
      </Stack>
    </PostHogProvider>
  );
}
