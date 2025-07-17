import { subject } from "@casl/ability";
import type { Pool } from "pg";
import { CaslAbilityFactory } from "./ability.factory";
import { ProfilesService } from "../profiles/profiles.service";

function makePool(memberWorkspaceIds: string[]): Pool {
  return {
    query: jest.fn().mockResolvedValue({
      rows: memberWorkspaceIds.map((id) => ({ workspace_id: id })),
    }),
  } as unknown as Pool;
}

function makeProfiles(isPro: boolean) {
  return { isPro: jest.fn().mockResolvedValue(isPro) } as unknown as ProfilesService;
}

describe("CaslAbilityFactory", () => {
  describe("workspace creation (Pro-gating)", () => {
    it("lets a non-Pro user create a public workspace", async () => {
      const factory = new CaslAbilityFactory(makePool([]), makeProfiles(false));
      const ability = await factory.createForUser("user-1");
      expect(ability.can("create", subject("Workspace", { visibility: "public" as const }))).toBe(true);
    });

    it("blocks a non-Pro user from creating an invite-only workspace", async () => {
      const factory = new CaslAbilityFactory(makePool([]), makeProfiles(false));
      const ability = await factory.createForUser("user-1");
      expect(ability.can("create", subject("Workspace", { visibility: "invite_only" as const }))).toBe(
        false,
      );
    });

    it("lets a Pro user create an invite-only workspace", async () => {
      const factory = new CaslAbilityFactory(makePool([]), makeProfiles(true));
      const ability = await factory.createForUser("user-1");
      expect(ability.can("create", subject("Workspace", { visibility: "invite_only" as const }))).toBe(
        true,
      );
    });
  });

  describe("snippet read access", () => {
    it("lets the owner read their own snippet", async () => {
      const factory = new CaslAbilityFactory(makePool([]), makeProfiles(false));
      const ability = await factory.createForUser("owner-1");
      const snippet = subject("Snippet", {
        ownerId: "owner-1",
        shareSlug: null,
        workspaceId: null,
      });
      expect(ability.can("read", snippet)).toBe(true);
      expect(ability.can("update", snippet)).toBe(true);
    });

    it("lets anyone read a snippet with a public share slug", async () => {
      const factory = new CaslAbilityFactory(makePool([]), makeProfiles(false));
      const ability = await factory.createForUser("stranger");
      const snippet = subject("Snippet", {
        ownerId: "someone-else",
        shareSlug: "abc123",
        workspaceId: null,
      });
      expect(ability.can("read", snippet)).toBe(true);
      // read-only: a stranger still can't edit a shared snippet
      expect(ability.can("update", snippet)).toBe(false);
    });

    it("lets a workspace member read snippets in that workspace, but not edit them", async () => {
      const factory = new CaslAbilityFactory(makePool(["ws-1"]), makeProfiles(false));
      const ability = await factory.createForUser("member-1");
      const snippet = subject("Snippet", {
        ownerId: "someone-else",
        shareSlug: null,
        workspaceId: "ws-1",
      });
      expect(ability.can("read", snippet)).toBe(true);
      expect(ability.can("update", snippet)).toBe(false);
    });

    it("blocks a stranger with no share link or membership from reading a private snippet", async () => {
      const factory = new CaslAbilityFactory(makePool([]), makeProfiles(false));
      const ability = await factory.createForUser("stranger");
      const snippet = subject("Snippet", {
        ownerId: "someone-else",
        shareSlug: null,
        workspaceId: "ws-not-a-member-of",
      });
      expect(ability.can("read", snippet)).toBe(false);
    });
  });
});
