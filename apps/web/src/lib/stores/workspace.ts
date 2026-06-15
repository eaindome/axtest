import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import type { Workspace } from '$lib/api/types'

export const workspaces = writable<Workspace[]>([])
export const currentWorkspace = writable<Workspace | null>(null)

const storedId = browser ? localStorage.getItem('axtest_workspace') : null
export const savedWorkspaceId = storedId ? Number(storedId) : null

export function setWorkspace(ws: Workspace) {
  if (browser) localStorage.setItem('axtest_workspace', String(ws.id))
  currentWorkspace.set(ws)
}
