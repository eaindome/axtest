import chalk from 'chalk'
import type { RunResult, TestResult } from '@axtest/core'

export function printResults(results: RunResult[]): void {
  for (const result of results) {
    printFileResult(result)
  }
  printSummary(results)
}

function printFileResult(result: RunResult): void {
  const relPath = result.file.replace(process.cwd(), '.').replace(/\\/g, '/')
  console.log()
  console.log(chalk.bold(relPath))
  console.log(chalk.dim('─'.repeat(50)))

  for (const test of result.tests) {
    printTestResult(test)
  }
}

function printTestResult(test: TestResult): void {
  const duration = formatDuration(test.duration)

  if (test.status === 'passed') {
    console.log(
      chalk.green('  ✓') +
      chalk.dim(` ${test.id}`) +
      `  ${test.description}` +
      chalk.dim(`  (${duration})`),
    )
  } else if (test.status === 'skipped') {
    console.log(
      chalk.yellow('  ○') +
      chalk.dim(` ${test.id}`) +
      `  ${test.description}` +
      chalk.dim(`  (${duration})`),
    )
    if (test.skipReason) {
      console.log(chalk.yellow(`    ○ skipped: ${test.skipReason}`))
    }
  } else {
    console.log(
      chalk.red('  ✗') +
      chalk.dim(` ${test.id}`) +
      `  ${test.description}` +
      chalk.dim(`  (${duration})`),
    )

    const failedStep = test.steps.find(s => s.status === 'failed')
    if (failedStep) {
      console.log(chalk.red(`    ✗ ${failedStep.raw}`))
      if (failedStep.error) {
        for (const line of failedStep.error.split('\n')) {
          console.log(chalk.dim(`      ${line}`))
        }
      }
      if (failedStep.screenshot) {
        console.log(chalk.cyan(`    📸 ${failedStep.screenshot}`))
      }
    }
  }
}

function printSummary(results: RunResult[]): void {
  const totalPassed = results.reduce((s, r) => s + r.passed, 0)
  const totalFailed = results.reduce((s, r) => s + r.failed, 0)
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0)
  const totalDuration = results.reduce((s, r) => s + r.duration, 0)

  console.log()
  console.log(chalk.dim('─'.repeat(50)))

  const parts: string[] = []
  if (totalPassed > 0) parts.push(chalk.green(`✓ ${totalPassed} passed`))
  if (totalFailed > 0) parts.push(chalk.red(`✗ ${totalFailed} failed`))
  if (totalSkipped > 0) parts.push(chalk.yellow(`○ ${totalSkipped} skipped`))
  parts.push(chalk.dim(`(${formatDuration(totalDuration)})`))

  console.log(parts.join('  '))
  console.log()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
