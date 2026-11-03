import { writable } from 'svelte/store'

// Keep project identity stable while individual tabs reload their own data.
export const projectNames = writable<Record<string, string>>({})
