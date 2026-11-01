import { parseAxtest, serializeAxtest } from '$lib/editor/parse-axtest'
import { runInputNames } from '$lib/editor/run-inputs'
import type { TestFile } from '$lib/api/types'

export function discoverSuites(files: TestFile[]) {
  return files.filter(file => /^\s*TEST\s+/m.test(file.content)).map(file => ({ ...file, parsed: parseAxtest(file.content) })).filter(file => file.parsed.tests.length > 0)
}
export function selectedInputNames(files: TestFile[], selection: Record<string, string[]>): string[] {
  const names = new Set<string>()
  for (const file of discoverSuites(files)) {
    const chosen = new Set(selection[file.id] ?? [])
    const visit = (name: string) => {
      const test = file.parsed.tests.find(test => test.name === name || test.id === name)
      if (test?.dependsOn && !chosen.has(test.dependsOn)) { chosen.add(test.dependsOn); visit(test.dependsOn) }
    }
    for (const name of [...chosen]) visit(name)
    if (!chosen.size) continue
    const content = serializeAxtest({ ...file.parsed, tests: file.parsed.tests.filter(test => chosen.has(test.name) || chosen.has(test.id)) })
    runInputNames(content, files).forEach(name => { if (name !== 'AXTEST_CASE') names.add(name) })
  }
  return [...names].sort()
}
export function normalizedUrl(url: string) { try { return new URL(url).href.replace(/\/+$/, '') } catch { return url.replace(/\/+$/, '') } }
