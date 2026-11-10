import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Keychain on iOS; localStorage when running in a browser during development.
export const tokenStorage = {
  get: (key: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key)),
  set: (key: string, value: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.setItem(key, value)) : SecureStore.setItemAsync(key, value)),
  remove: (key: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.removeItem(key)) : SecureStore.deleteItemAsync(key)),
};
