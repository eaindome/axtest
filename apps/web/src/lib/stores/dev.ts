import { writable, get } from 'svelte/store'
import { browser, dev } from '$app/environment'

// Default to mock ON in dev so any credentials work without a running API
const stored = browser ? localStorage.getItem('axtest_mock') : null
const requested = browser ? new URLSearchParams(location.search).get('mode') : null
const initial = requested === 'api' ? false : requested === 'mock' ? true : stored !== null ? stored === 'true' : dev

export const useMock = writable<boolean>(initial)

if (browser) {
  useMock.subscribe((val) => localStorage.setItem('axtest_mock', String(val)))
}

// Session and workspace identities must never cross the mock/API boundary.
export function modeKey(key: string): string {
  return `${get(useMock) ? 'mock' : 'api'}:${key}`
}
export function readModeStorage(key: string): string | null {
  if (!browser) return null
  const scoped = modeKey(key)
  const value = localStorage.getItem(scoped)
  if (value !== null) return value
  if (get(useMock)) {
    const legacy = localStorage.getItem(key)
    if (legacy !== null) {
      localStorage.setItem(scoped, legacy)
      localStorage.removeItem(key)
    }
    return legacy
  }
  return null
}
export function switchDataMode(mock: boolean) {
  if (!browser || mock === get(useMock)) return
  const event = new Event('axtest:before-mode-switch', { cancelable: true })
  if (!window.dispatchEvent(event)) return
  // Keep in-flight requests bound to the old mode until the new document loads.
  localStorage.setItem('axtest_mock', String(mock))
  window.location.assign('/dashboard')
}
