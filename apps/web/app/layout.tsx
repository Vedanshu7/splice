import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/auth-provider";
import { PostHogProvider } from "@/components/posthog-provider";

export const metadata: Metadata = {
  title: "Splice — snippet manager",
  description: "Save, search, and share code snippets with AI-assisted tagging and search.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", GeistSans.variable)}>
      <body className="min-h-screen antialiased">
        <PostHogProvider>
          <AuthProvider>{children}</AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
