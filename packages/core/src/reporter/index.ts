import type { RunResult, TestResult, StepResult } from '../types/index.js'

// ─── Text reporter (default) ──────────────────────────────────────────────────

export function formatTextReport(results: RunResult[]): string {
  const lines: string[] = []
  const totalDuration = results.reduce((s, r) => s + r.duration, 0)

  for (const result of results) {
    lines.push(formatFileResult(result))
  }

  // Summary
  const totalPassed = results.reduce((s, r) => s + r.passed, 0)
  const totalFailed = results.reduce((s, r) => s + r.failed, 0)
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0)

  lines.push('─'.repeat(50))
  lines.push(
    `${totalPassed > 0 ? `✓ ${totalPassed} passed` : ''}` +
    `${totalFailed > 0 ? `  ✗ ${totalFailed} failed` : ''}` +
    `${totalSkipped > 0 ? `  ○ ${totalSkipped} skipped` : ''}` +
    `  (${formatDuration(totalDuration)})`,
  )

  return lines.join('\n')
}

function formatFileResult(result: RunResult): string {
  const lines: string[] = []
  const relPath = result.file.replace(process.cwd(), '.').replace(/\\/g, '/')

  lines.push('')
  lines.push(relPath)
  lines.push('─'.repeat(50))

  for (const test of result.tests) {
    lines.push(formatTestResult(test))
  }

  return lines.join('\n')
}

function formatTestResult(test: TestResult): string {
  const lines: string[] = []
  const icon = test.status === 'passed' ? '✓' : test.status === 'skipped' ? '○' : '✗'
  const duration = formatDuration(test.duration)

  lines.push(`  ${icon} ${test.id}  ${test.description}  (${duration})`)

  if (test.status === 'skipped' && test.skipReason) {
    lines.push(`    ○ skipped: ${test.skipReason}`)
  }

  if (test.status === 'failed') {
    const failedStep = test.steps.find(s => s.status === 'failed')
    if (failedStep) {
      lines.push(`    ✗ ${failedStep.raw}`)
      if (failedStep.error) {
        // Indent error message
        const errorLines = failedStep.error.split('\n').map(l => `      ${l}`)
        lines.push(...errorLines)
      }
      if (failedStep.screenshot) {
        lines.push(`    📸 ${failedStep.screenshot}`)
      }
    }
  }

  return lines.join('\n')
}

// ─── JSON reporter ────────────────────────────────────────────────────────────

export function formatJsonReport(results: RunResult[]): string {
  return JSON.stringify(results, null, 2)
}

// ─── JUnit reporter (for CI systems) ─────────────────────────────────────────

export function formatJunitReport(results: RunResult[]): string {
  const totalTests = results.reduce((s, r) => s + r.tests.length, 0)
  const totalFailed = results.reduce((s, r) => s + r.failed, 0)
  const totalTime = results.reduce((s, r) => s + r.duration, 0) / 1000

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites tests="${totalTests}" failures="${totalFailed}" time="${totalTime.toFixed(3)}">`,
  ]

  for (const result of results) {
    const suiteName = result.file.split('/').pop()?.replace('.axtest', '') ?? result.file
    lines.push(
      `  <testsuite name="${escapeXml(suiteName)}" tests="${result.tests.length}" ` +
      `failures="${result.failed}" time="${(result.duration / 1000).toFixed(3)}">`,
    )
    for (const test of result.tests) {
      lines.push(
        `    <testcase name="${escapeXml(`${test.id}: ${test.description}`)}" ` +
        `time="${(test.duration / 1000).toFixed(3)}">`,
      )
      if (test.status === 'skipped') {
        lines.push(`      <skipped message="${escapeXml(test.skipReason ?? '')}"/>`)
      } else if (test.status === 'failed') {
        const failedStep = test.steps.find(s => s.status === 'failed')
        lines.push(
          `      <failure message="${escapeXml(failedStep?.error ?? 'Test failed')}">` +
          `${escapeXml(failedStep?.raw ?? '')}` +
          `</failure>`,
        )
      }
      lines.push('    </testcase>')
    }
    lines.push('  </testsuite>')
  }

  lines.push('</testsuites>')
  return lines.join('\n')
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
