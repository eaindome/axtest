import { browser } from '$app/environment'

const STORAGE_KEY = 'axtest_editor_panels'

export interface EditorPanelSizes {
  explorer: number
  outline: number
  results: number
}

const DEFAULTS: EditorPanelSizes = {
  explorer: 208,
  outline: 224,
  results: 220,
}

export function loadPanelSizes(): EditorPanelSizes {
  if (!browser) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePanelSizes(sizes: EditorPanelSizes) {
  if (!browser) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export type FileRunStatus = 'passed' | 'failed' | 'partial'

export interface FileStatusInfo {
  dirty?: boolean
  runStatus?: FileRunStatus
}
