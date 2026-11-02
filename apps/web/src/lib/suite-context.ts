import { modeKey } from '$lib/stores/dev'
import type { EnvironmentName, TestFile } from '$lib/api/types'
import { parseAxtest } from '$lib/editor/parse-axtest'

export function suitePreferenceKey(user: number | string | undefined, workspace: number | string | undefined, project: number | string | undefined) {
  return modeKey(`suites:${user}:${workspace}:${project}`)
}
export function readSuitePreferences(key: string) {
  try { const value = JSON.parse(localStorage.getItem(key) ?? '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { return {} }
}
export function saveSuiteContext(key: string, patch: Record<string, unknown>) {
  localStorage.setItem(key, JSON.stringify({ ...readSuitePreferences(key), ...patch }))
}
export function savedEnvironment(value: unknown): EnvironmentName {
  return value === 'local' || value === 'staging' ? value : 'production'
}
export function reconcileSuiteSelection(key: string, before: TestFile, after: TestFile) {
  const preferences = readSuitePreferences(key), selected = preferences.selection?.[before.id]
  if (!Array.isArray(selected)) return
  const previous = parseAxtest(before.content).tests, next = parseAxtest(after.content).tests
  const names = selected.flatMap(name => {
    const test = previous.find(test => test.name === name)
    const updated = next.find(item => item.id === test?.id) ?? next.find(item => item.name === name)
    return updated ? [updated.name] : []
  })
  saveSuiteContext(key, { selection: { ...preferences.selection, [after.id]: names } })
}
