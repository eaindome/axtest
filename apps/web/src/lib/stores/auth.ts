import { writable, derived } from "svelte/store";
import { browser } from "$app/environment";
import type { User } from "$lib/api/types";

interface AuthState {
  user: User | null;
  token: string | null;
}

function storedUser(): User | null {
  if (!browser) return null;
  try {
    const value = JSON.parse(localStorage.getItem("axtest_user") ?? "null");
    return value &&
      typeof value.id === "number" &&
      typeof value.name === "string" &&
      typeof value.email === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}

export const authStore = writable<AuthState>({
  user: storedUser(),
  token: browser ? localStorage.getItem("axtest_token") : null,
});

export const isAuthenticated = derived(authStore, ($a) => !!$a.token);

export function setAuth(user: User, token: string) {
  if (browser) {
    localStorage.setItem("axtest_token", token);
    localStorage.setItem("axtest_user", JSON.stringify(user));
  }
  authStore.set({ user, token });
}

export function clearAuth() {
  if (browser) {
    localStorage.removeItem("axtest_token");
    localStorage.removeItem("axtest_user");
  }
  authStore.set({ user: null, token: null });
}
