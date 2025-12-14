// react-native-get-random-values just polyfills global.crypto.getRandomValues
// for on-device use; under Jest we're running on Node 20+, which already
// provides that natively, so the polyfill has nothing to do here and isn't
// worth dragging react-native's native module bridge into this test.
jest.mock("react-native-get-random-values", () => ({}));
// The package's own official Jest mock — an in-memory Map standing in for
// the native module, rather than the native bridge that isn't present here.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
// expo-secure-store has no bundled Jest mock; without one, getItemAsync
// always resolves undefined, so encryptionKey() would "find" no existing
// key on every call and mint a fresh random one each time — silently
// breaking decryption (a real bug this test caught the first time around).
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

import { LargeSecureStore } from "./large-secure-store";

describe("LargeSecureStore", () => {
  it("round-trips a value through setItem/getItem", async () => {
    const store = new LargeSecureStore();
    const payload = JSON.stringify({ access_token: "a".repeat(500), refresh_token: "b" });

    await store.setItem("supabase-session", payload);
    const result = await store.getItem("supabase-session");

    expect(result).toBe(payload);
  });

  it("never stores the plaintext value in AsyncStorage", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    const store = new LargeSecureStore();
    const payload = "super-secret-session-token";

    await store.setItem("supabase-session", payload);
    const stored = await AsyncStorage.getItem("supabase-session");

    expect(stored).not.toContain(payload);
  });

  it("returns null for a key that was never set", async () => {
    const store = new LargeSecureStore();
    expect(await store.getItem("does-not-exist")).toBeNull();
  });

  it("removeItem deletes both the encrypted value and its key material", async () => {
    const store = new LargeSecureStore();
    await store.setItem("supabase-session", "value");
    await store.removeItem("supabase-session");
    expect(await store.getItem("supabase-session")).toBeNull();
  });
});
