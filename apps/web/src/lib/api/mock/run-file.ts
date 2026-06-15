import type { RunDetail, ResultItem } from '../types'
import { parseAxtest } from '$lib/editor/parse-axtest'

const FAILING_TESTS = new Set([
  'Apply discount to student account',
  'View discount history',
  'Remove applied discount',
])

const FAIL_MESSAGES: Record<string, { error: string; step: string }> = {
  'Apply discount to student account': {
    error: 'Element not found: "Apply Discount" button',
    step: 'click "Apply Discount"',
  },
  'View discount history': {
    error: 'Expected modal to be visible but it was not',
    step: 'assert modal "Discount History" is_visible',
  },
  'Remove applied discount': {
    error: 'Element not found: "Remove" in row "20% Early Payment"',
    step: 'click "Remove" in row "20% Early Payment"',
  },
}

export async function simulateFileRun(
  fileName: string,
  content: string,
  environment: string,
  triggeredBy: string,
  testNames?: string[],
): Promise<RunDetail> {
  const parsed = parseAxtest(content)
  let tests = parsed.tests
  if (testNames?.length) {
    const set = new Set(testNames)
    tests = tests.filter(t => set.has(t.name))
  }
  const startedAt = new Date()

  await new Promise(r => setTimeout(r, 400 + tests.length * 300))

  const results: ResultItem[] = tests.map((t, i) => {
    const failed = FAILING_TESTS.has(t.name)
    const fail = FAIL_MESSAGES[t.name]
    return {
      id: i + 1,
      testId: `test-${i + 1}`,
      testName: t.name,
      status: failed ? 'failed' as const : 'passed' as const,
      durationMs: 900 + Math.floor(Math.random() * 1500),
      errorMessage: failed ? fail?.error ?? 'Assertion failed' : null,
      failedStep: failed ? fail?.step ?? null : null,
      order: i + 1,
    }
  })

  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - startedAt.getTime()

  return {
    id: Date.now(),
    status: failed > 0 ? 'failed' : 'passed',
    environment,
    totalTests: results.length,
    passedTests: passed,
    failedTests: failed,
    durationMs,
    suiteName: fileName,
    triggeredBy,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    results,
  }
}
