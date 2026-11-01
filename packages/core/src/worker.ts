// Internal JSON-over-stdin protocol. All diagnostics go to stderr; stdout is one JSON response.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseContent } from './parser/index.js'
import { executeFile } from './executor/index.js'
import { parseAxtest, serializeAxtest } from './authoring/parse-axtest.js'
import { appendGeneratedTests } from './authoring/generate-tests.js'
import type { FileContext, TestSpec } from './types/index.js'

type Input = {
  command: string
  content: string
  fileName?: string
  baseUrl?: string
  testNames?: string[]
  files?: { path: string; content: string }[]
  artifactDirectory?: string
  timeoutMs?: number
  browserExecutablePath?: string
  variables?: Record<string, string>
  seedTestId?: string
}

async function main(input: Input): Promise<unknown> {
  for (const [key, value] of Object.entries(input.variables ?? {})) {
    if (
      !/^[A-Z][A-Z0-9_]*$/.test(key) ||
      /^(PATH|NODE_OPTIONS|NODE_PATH|HOME|SYSTEMROOT|COMSPEC|PLAYWRIGHT_.*)$/.test(
        key,
      )
    )
      throw new Error('Invalid variable name.')
    process.env[key] = value
  }
  if (input.command === 'generate') {
    parseContent(input.content)
    const parsed = parseAxtest(input.content)
    if (!parsed.tests.some((t) => t.id === input.seedTestId)) {
      const candidates = parsed.tests.filter((t) => t.kind === 'seed')
      const seed =
        candidates.length === 1
          ? candidates[0]
          : parsed.tests.length === 1
            ? parsed.tests[0]
            : null
      if (
        /^\s*ID\s+/m.test(input.content) ||
        !seed ||
        !/^[\w-]+$/.test(input.seedTestId ?? '')
      )
        throw new Error(
          'Seed test not found. Save stable test IDs before generating from multiple tests.',
        )
      seed.id = input.seedTestId!
    }
    const result = appendGeneratedTests(parsed, input.seedTestId!)
    return {
      content: serializeAxtest(result.parsed),
      generatedCount: result.count,
    }
  }
  function checkServerFlow(flow: FileContext) {
    if (flow.tests.some(t => [...t.setup, ...t.stepGroups.flatMap(g => g.steps)].some(a => a.type === 'upload'))) {
      throw new Error('Server-side file uploads require managed assets and are currently disabled. Local CLI uploads remain available.')
    }
  }
  const file = parseContent(input.content, input.fileName ?? '<inline>')
  checkServerFlow(file)
  if (!file.tests.length) throw new Error('No tests found.')
  const byId = new Map(file.tests.map((t) => [t.id, t]))
  const selected = input.testNames?.length
    ? file.tests.filter((t) => input.testNames!.includes(t.description))
    : file.tests
  if (
    input.testNames?.some((n) => !file.tests.some((t) => t.description === n))
  )
    throw new Error('One or more requested tests were not found.')
  const ordered: TestSpec[] = [],
    visiting = new Set<string>(),
    visited = new Set<string>()
  function visit(test: TestSpec) {
    if (visited.has(test.id)) return
    if (visiting.has(test.id)) throw new Error('Circular test dependency.')
    visiting.add(test.id)
    for (const dep of test.dependsOn ?? []) {
      const parent = byId.get(dep)
      if (!parent) throw new Error(`Missing dependency: ${dep}`)
      visit(parent)
    }
    visiting.delete(test.id)
    visited.add(test.id)
    ordered.push(test)
  }
  for (const test of selected) visit(test)
  file.tests = ordered
  if (input.command === 'validate')
    return {
      testCount: ordered.length,
      testNames: ordered.map((t) => t.description),
      selectedTests: ordered.map((t) => ({ id: t.id, name: t.description })),
    }
  if (input.command !== 'run') throw new Error('Unknown worker command.')
  if (
    !input.baseUrl ||
    !['http:', 'https:'].includes(new URL(input.baseUrl).protocol)
  )
    throw new Error('A valid HTTP(S) environment URL is required.')
  const auth = new Map<string, FileContext>(),
    modules = new Map<string, FileContext>()
  for (const entry of input.files ?? []) {
    const map = entry.path.startsWith('auth/')
      ? auth
      : entry.path.startsWith('modules/')
        ? modules
        : null
    if (!map) continue
    const name = basename(entry.path, '.axtest')
    const relative = entry.path
      .replace(/^(auth|modules)\//, '')
      .replace(/\.axtest$/, '')
    const declaration = entry.content
      .match(
        map === auth ? /^\s*AUTH\s+([^\r\n]+)/m : /^\s*MODULE\s+([^\r\n]+)/m,
      )?.[1]
      .trim()
      .replace(/^"|"$/g, '')
    const aliases = [
      ...new Set([name, relative, declaration].filter((v): v is string => !!v)),
    ]
    const needed =
      map === auth
        ? ordered.some((t) => aliases.includes(t.auth ?? file.auth ?? ''))
        : aliases.includes(file.module ?? '')
    if (!needed) continue
    const flow = parseContent(entry.content, entry.path)
    checkServerFlow(flow)
    for (const alias of aliases) {
      if (map.has(alias)) throw new Error(`Ambiguous reusable flow: ${alias}`)
      map.set(alias, flow)
    }
  }
  const abort = new AbortController()
  const parentPid = process.ppid
  const watch = setInterval(() => {
    try {
      process.kill(parentPid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') abort.abort()
    }
  }, 500)
  watch.unref()
  const timeout = setTimeout(
    () => abort.abort(),
    Math.min(input.timeoutMs ?? 120000, 300000),
  )
  timeout.unref()
  try {
    const result = await executeFile(
      file,
      auth,
      modules,
      {
        baseUrl: input.baseUrl,
        artifactDirectory: input.artifactDirectory,
        signal: abort.signal,
      },
      { timeout: 7000, browserExecutablePath: input.browserExecutablePath, ...(Object.keys(input.variables ?? {}).length ? { screenshots: 'never' as const } : {}) },
    )
    if (abort.signal.aborted)
      throw new Error('Execution canceled or timed out.')
    return result
  } finally {
    clearInterval(watch)
    clearTimeout(timeout)
  }
}

async function run() {
  let values: string[] = []
  function redact(value: unknown): unknown {
    if (typeof value === 'string') return values.reduce((text, secret) => text.replaceAll(secret, '[redacted]'), value)
    if (Array.isArray(value)) return value.map(redact)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redact(entry)]))
    return value
  }
  try {
    const input = JSON.parse(readFileSync(0, 'utf8')) as Input
    values = Object.values(input.variables ?? {}).filter(Boolean).sort((a, b) => b.length - a.length)
    const result = await main(input)
    process.stdout.write(JSON.stringify(redact({ ok: true, result })))
  } catch (error) {
    process.stdout.write(
      JSON.stringify(redact({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })),
    )
    process.exitCode = 1
  }
}
void run()
