import { parseAxtest } from '$lib/editor/parse-axtest'
import { runInputNames } from '$lib/editor/run-inputs'
import type { TestFile } from '$lib/api/types'
import type { TestBlock } from '$lib/editor/types'

export function discoverSuites(files: TestFile[]) {
  return files.filter(file => /^[ \t]*TEST\s+/m.test(file.content) || /^# axtest:suite$/m.test(file.content))
    .map(file => ({ ...file, parsed: parseAxtest(file.content) })).filter(file => !file.parsed.flow)
}
export function suiteLabel(file: TestFile) {
  return parseAxtest(file.content).title || file.name.replace(/\.axtest$/i, '').replace(/[-_]/g, ' ').replace(/^./, value => value.toUpperCase())
}
export function testSources(file: TestFile) {
  const matches = [...file.content.matchAll(/^[ \t]*TEST[ \t]+/gm)]
  return { header: file.content.slice(0, matches[0]?.index ?? file.content.length), blocks: matches.map((match, index) => ({ start: match.index!, end: matches[index + 1]?.index ?? file.content.length, content: file.content.slice(match.index, matches[index + 1]?.index) })) }
}
export function selectedExecution(files: TestFile[], selection: Record<string, string[]>) {
  const errors: string[] = []
  const entries = discoverSuites(files).flatMap(file => {
    const direct = file.parsed.tests.filter(test => (selection[file.id] ?? []).includes(test.name))
    if (!direct.length) return []
    const ordered: TestBlock[] = [], visited = new Set<string>(), visiting = new Set<string>()
    function visit(test: TestBlock) {
      if (visited.has(test.name)) return
      if (visiting.has(test.name)) { errors.push(`${suiteLabel(file)} has a circular test dependency.`); return }
      visiting.add(test.name)
      if (test.dependsOn) {
        for (const dependency of test.dependsOn.split(/,\s*/).map(value => value.replace(/^"|"$/g, ''))) {
          const parent = file.parsed.tests.find(item => item.id === dependency || item.name === dependency)
          if (parent) visit(parent); else errors.push(`${test.name}: dependency ${dependency} could not be found.`)
        }
      }
      visiting.delete(test.name); visited.add(test.name); ordered.push(test)
    }
    for (const test of direct) visit(test)
    const sources = testSources(file)
    const content = sources.header + ordered.map(test => sources.blocks[file.parsed.tests.indexOf(test)]?.content ?? '').join('\n')
    for (const test of ordered) {
      if (!test.asserts.length) errors.push(`${test.name} needs at least one expected result.`)
      if (file.parsed.tests.filter(item => item.name === test.name).length > 1) errors.push(`${suiteLabel(file)} has duplicate test names: ${test.name}. Rename one before running.`)
    }
    for (const match of content.matchAll(/^[ \t]*(AUTH|MODULE)\s+"?([^"\r\n]+)"?\s*$/gm)) {
      const folder = match[1] === 'AUTH' ? 'auth/' : 'modules/', alias = match[2].trim()
      if (!files.some(item => item.path.startsWith(folder) && [item.path.slice(folder.length).replace(/\.axtest$/, ''), item.name.replace(/\.axtest$/, ''), item.content.match(/^[ \t]*(?:AUTH|MODULE)\s+"?([^"\r\n]+)"?/m)?.[1].trim()].includes(alias))) errors.push(`${suiteLabel(file)}: ${match[1] === 'AUTH' ? 'login flow' : 'reusable setup'} ${alias} is missing.`)
    }
    return [{ file, direct, tests: ordered, included: ordered.filter(test => !direct.some(item => item.name === test.name)), content }]
  })
  return { entries, errors: [...new Set(errors)], count: entries.reduce((sum, entry) => sum + entry.tests.length, 0), included: entries.flatMap(entry => entry.included.map(test => ({ suite: suiteLabel(entry.file), name: test.name }))) }
}
export function selectedInputNames(files: TestFile[], selection: Record<string, string[]>): string[] {
  return [...new Set(selectedExecution(files, selection).entries.flatMap(entry => runInputNames(entry.content, files)).filter(name => name !== 'AXTEST_CASE'))].sort()
}
export function canEditBehaviour(file: TestFile, test: TestBlock) {
  const index = parseAxtest(file.content).tests.findIndex(item => item.name === test.name)
  const source = testSources(file).blocks[index]?.content ?? ''
  return !test.dependsOn.includes(',') && (source.match(/^[ \t]*STEPS\s*$/gm)?.length ?? 0) === 1 && (source.match(/^[ \t]*ASSERT\s*$/gm)?.length ?? 0) === 1 && !/^[ \t]*(?:SETUP|AUTH|GENERATED)\s+/m.test(source) && !test.steps.some(step => !['navigate','click','type','select','clear','wait'].includes(step.type)) && !test.asserts.some(step => step.type !== 'assert' || !/^(?:".*" (?:is_visible|is_not_visible|is_enabled|is_disabled|contains ".*")|url contains ".*")$/.test(step.assertion))
}
export function normalizedUrl(url: string) { try { return new URL(url).href.replace(/\/+$/, '') } catch { return url.replace(/\/+$/, '') } }
