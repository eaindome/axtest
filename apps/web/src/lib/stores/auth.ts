import { writable, derived } from 'svelte/store'
import { browser } from '$app/environment'
import type { User } from '$lib/api/types'

interface AuthState {
  user: User | null
  token: string | null
}

export const authStore = writable<AuthState>({
  user: null,
  token: browser ? localStorage.getItem('axtest_token') : null
})

export const isAuthenticated = derived(authStore, $a => !!$a.token)

export function setAuth(user: User, token: string) {
  if (browser) localStorage.setItem('axtest_token', token)
  authStore.set({ user, token })
}

export function clearAuth() {
  if (browser) localStorage.removeItem('axtest_token')
  authStore.set({ user: null, token: null })
}
