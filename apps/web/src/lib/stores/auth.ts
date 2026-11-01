import { get, writable, derived } from 'svelte/store'
import { browser } from '$app/environment'
import { useMock, modeKey, readModeStorage } from './dev'
import type { User } from '$lib/api/types'
interface AuthState { user: User | null; token: string | null }
function mockUser(): User | null {
  if (!browser || !get(useMock)) return null
  try { const value = JSON.parse(readModeStorage('axtest_user') ?? 'null'); return value?.id && typeof value.name === 'string' ? { ...value, username: value.username ?? 'demo' } : null } catch { return null }
}
// API identity is restored from an HttpOnly cookie via the server, never trusted from localStorage.
if (browser && !get(useMock)) { localStorage.removeItem(modeKey('axtest_token')); localStorage.removeItem(modeKey('axtest_user')) }
export const authStore = writable<AuthState>({ user: mockUser(), token: browser && get(useMock) ? readModeStorage('axtest_token') : null })
export const isAuthenticated = derived(authStore, a => !!a.user)
export function setAuth(user: User, token?: string) {
  if (browser && get(useMock)) { localStorage.setItem(modeKey('axtest_token'), token ?? 'mock'); localStorage.setItem(modeKey('axtest_user'), JSON.stringify(user)) }
  authStore.set({ user, token: get(useMock) ? token ?? 'mock' : null })
}
export function clearAuth() {
  if (browser) { localStorage.removeItem(modeKey('axtest_token')); localStorage.removeItem(modeKey('axtest_user')) }
  authStore.set({ user: null, token: null })
}
