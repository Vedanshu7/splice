import { render, screen } from "@testing-library/react";
import type { Snippet } from "@splice/shared";
import { SnippetCard } from "./snippet-card";

function makeSnippet(overrides: Partial<Snippet> = {}): Snippet {
  return {
    id: "1",
    ownerId: "owner-1",
    workspaceId: null,
    title: "Auth middleware",
    content: "export function auth() { /* ... */ }",
    language: "typescript",
    tags: [],
    aiSummary: null,
    shareSlug: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("SnippetCard", () => {
  it("renders the title and language", () => {
    render(<SnippetCard snippet={makeSnippet()} />);
    expect(screen.getByText("Auth middleware")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("prefers the AI summary over a raw content preview when present", () => {
    render(<SnippetCard snippet={makeSnippet({ aiSummary: "Verifies a request's JWT." })} />);
    expect(screen.getByText("Verifies a request's JWT.")).toBeInTheDocument();
  });

  it("falls back to a content preview when there's no AI summary yet", () => {
    render(<SnippetCard snippet={makeSnippet({ aiSummary: null, content: "const x = 1;" })} />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders every tag", () => {
    render(
      <SnippetCard
        snippet={makeSnippet({
          tags: [
            { id: "t1", name: "auth" },
            { id: "t2", name: "jwt" },
          ],
        })}
      />,
    );
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("jwt")).toBeInTheDocument();
  });
});
