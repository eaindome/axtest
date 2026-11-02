import { writable } from 'svelte/store'

export type Toast = { id: number; message: string; kind: 'success' | 'error' }
export const toasts = writable<Toast[]>([])
let nextId = 0
export function dismissToast(id: number) { toasts.update(items => items.filter(item => item.id !== id)) }
export function toast(message: string, kind: Toast['kind'] = 'success') {
  const id = ++nextId
  toasts.update(items => [...items.slice(-3), { id, message, kind }])
  return id
}
