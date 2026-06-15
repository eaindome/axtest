import { writable } from 'svelte/store'

export interface PageAction {
  label: string
  onclick: () => void
}

export const pageTitle    = writable<string>('')
export const pageSubtitle = writable<string>('')
export const pageAction   = writable<PageAction | null>(null)
export const immersiveMode = writable<boolean>(false)
