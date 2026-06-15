import { writable } from 'svelte/store'
import { browser, dev } from '$app/environment'

// Default to mock ON in dev so any credentials work without a running API
const stored = browser ? localStorage.getItem('axtest_mock') : null
const initial = stored !== null ? stored === 'true' : dev

export const useMock = writable<boolean>(initial)

if (browser) {
  useMock.subscribe(val => localStorage.setItem('axtest_mock', String(val)))
}
