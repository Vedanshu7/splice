import "react-native-get-random-values";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Supabase session payloads (access + refresh token, user metadata) routinely
 * exceed SecureStore's ~2KB item limit on iOS Keychain, so we can't just
 * swap AsyncStorage for SecureStore directly. Instead: the actual session
 * blob lives in AsyncStorage, encrypted with an AES key that itself lives in
 * SecureStore — the sensitive material never touches AsyncStorage in
 * plaintext, and the bulk payload isn't constrained by Keychain's size limit.
 * This mirrors Supabase's own documented pattern for Expo apps.
 */
export class LargeSecureStore {
  private async encryptionKey(uuid: string): Promise<Uint8Array> {
    const keyName = `splice-encryption-key-${uuid}`;
    let key = await SecureStore.getItemAsync(keyName);
    if (!key) {
      key = aesjs.utils.hex.fromBytes(crypto.getRandomValues(new Uint8Array(32)));
      await SecureStore.setItemAsync(keyName, key);
    }
    return aesjs.utils.hex.toBytes(key);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const [uuid, ciphertextHex] = encrypted.split(":");
    if (!uuid || !ciphertextHex) return null;

    const encryptionKey = await this.encryptionKey(uuid);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(ciphertextHex));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const uuid = aesjs.utils.hex.fromBytes(crypto.getRandomValues(new Uint8Array(16)));
    const encryptionKey = await this.encryptionKey(uuid);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    const ciphertextHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    await AsyncStorage.setItem(key, `${uuid}:${ciphertextHex}`);
  }

  async removeItem(key: string): Promise<void> {
    const encrypted = await AsyncStorage.getItem(key);
    if (encrypted) {
      const [uuid] = encrypted.split(":");
      if (uuid) await SecureStore.deleteItemAsync(`splice-encryption-key-${uuid}`);
    }
    await AsyncStorage.removeItem(key);
  }
}
