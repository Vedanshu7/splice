import { PostHogProvider as PHProvider } from "posthog-react-native";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * Wraps the app with PostHog (screen views + app lifecycle autocaptured).
 * Always mounts the real provider — posthog-react-native itself treats a
 * missing apiKey as "construct a client that just never sends anything",
 * so there's no separate no-op path to maintain here.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider apiKey={apiKey ?? ""} options={{ host }}>
      {children}
    </PHProvider>
  );
}
