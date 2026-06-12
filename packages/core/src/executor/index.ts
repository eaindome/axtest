import * as path from 'path'
import * as fs from 'fs'
import { chromium, firefox, webkit, type Browser, type Page, type BrowserContext } from 'playwright'
import type { FileContext, TestSpec, StepResult, TestResult, RunResult, RunOptions, AxtestConfig } from '../types/index.js'
import { executeAction } from './actions.js'
import { executeAssertion } from './assertions.js'

const DEFAULT_CONFIG: AxtestConfig = {
  baseUrl: process.env['BASE_URL'] ?? 'http://localhost:3000',
  browser: 'chromium',
  timeout: 10000,
  screenshots: 'on-failure',
}

export async function executeFile(
  fileContext: FileContext,
  authContexts: Map<string, FileContext>,
  moduleContexts: Map<string, FileContext>,
  options: RunOptions = {},
  config: Partial<AxtestConfig> = {},
): Promise<RunResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  if (options.baseUrl) cfg.baseUrl = options.baseUrl

  const startTime = Date.now()
  const results: TestResult[] = []

  // Determine which tests to run
  const testsToRun = options.testId
    ? fileContext.tests.filter(t => t.id === options.testId)
    : fileContext.tests

  if (testsToRun.length === 0) {
    return {
      file: fileContext.filePath,
      status: 'errored',
      duration: 0,
      passed: 0, failed: 0, skipped: 0,
      tests: [],
      error: options.testId ? `Test "${options.testId}" not found` : 'No tests found',
    }
  }

  // Track passed test IDs for DEPENDS ON resolution
  const passedIds = new Set<string>()

  const browserType = cfg.browser === 'firefox' ? firefox : cfg.browser === 'webkit' ? webkit : chromium
  const browser = await browserType.launch({ headless: !options.headed })

  try {
    for (const test of testsToRun) {
      // Check DEPENDS ON
      if (test.dependsOn?.length) {
        const unmet = test.dependsOn.filter(dep => !passedIds.has(dep))
        if (unmet.length > 0) {
          results.push({
            id: test.id,
            description: test.description,
            status: 'skipped',
            duration: 0,
            steps: [],
            skipReason: `Depends on ${unmet.join(', ')} which has not passed`,
          })
          continue
        }
      }

      const result = await executeTest(browser, test, fileContext, authContexts, moduleContexts, cfg, options)
      results.push(result)
      if (result.status === 'passed') passedIds.add(test.id)
      if (options.bail && result.status === 'failed') break
    }
  } finally {
    await browser.close()
  }

  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  const skipped = results.filter(r => r.status === 'skipped').length

  return {
    file: fileContext.filePath,
    status: failed > 0 ? 'failed' : 'passed',
    duration: Date.now() - startTime,
    passed, failed, skipped,
    tests: results,
  }
}

async function executeTest(
  browser: Browser,
  test: TestSpec,
  fileContext: FileContext,
  authContexts: Map<string, FileContext>,
  moduleContexts: Map<string, FileContext>,
  config: AxtestConfig,
  options: RunOptions,
): Promise<TestResult> {
  const startTime = Date.now()
  const steps: StepResult[] = []

  // Fresh browser context per test
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(config.timeout)

  try {
    // Run AUTH flow
    const authName = test.auth ?? fileContext.auth
    if (authName) {
      const authFile = authContexts.get(authName)
      if (!authFile) throw new Error(`AUTH "${authName}" not found. Check your auth/ folder.`)
      await runStepList(page, authFile.tests[0]?.stepGroups[0]?.steps ?? [], steps, config.baseUrl, config, options)
    }

    // Run MODULE flow
    const moduleName = fileContext.module
    if (moduleName) {
      const moduleFile = moduleContexts.get(moduleName)
      if (!moduleFile) throw new Error(`MODULE "${moduleName}" not found. Check your modules/ folder.`)
      await runStepList(page, moduleFile.tests[0]?.stepGroups[0]?.steps ?? [], steps, config.baseUrl, config, options)
    }

    // Run SETUP steps (not reported)
    for (const action of test.setup) {
      await executeAction(page, action, config.baseUrl)
    }

    // Run STEP groups (each group is a STEPS block followed by an ASSERT block)
    for (const group of test.stepGroups) {
      await runStepList(page, group.steps, steps, config.baseUrl, config, options)
      await runAssertionList(page, group.assertions, steps, config, options)
    }

    await context.close()
    return {
      id: test.id,
      description: test.description,
      status: 'passed',
      duration: Date.now() - startTime,
      steps,
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)

    // Capture screenshot on failure
    let screenshot: string | undefined
    if (config.screenshots !== 'never') {
      try {
        const screenshotDir = path.join(process.cwd(), 'results', 'screenshots')
        fs.mkdirSync(screenshotDir, { recursive: true })
        const screenshotPath = path.join(screenshotDir, `${test.id}-fail-${Date.now()}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        screenshot = screenshotPath
      } catch { /* ignore screenshot errors */ }
    }

    // Mark last step as failed
    if (steps.length > 0) {
      steps[steps.length - 1].status = 'failed'
      steps[steps.length - 1].error = error
      steps[steps.length - 1].screenshot = screenshot
    } else {
      steps.push({ raw: 'setup', status: 'failed', duration: 0, error, screenshot })
    }

    await context.close()
    return {
      id: test.id,
      description: test.description,
      status: 'failed',
      duration: Date.now() - startTime,
      steps,
    }
  }
}

async function runStepList(
  page: Page,
  actions: ReturnType<typeof Array.prototype.slice>[0][],
  steps: StepResult[],
  baseUrl: string,
  config: AxtestConfig,
  options: RunOptions,
): Promise<void> {
  for (const action of actions) {
    const start = Date.now()
    const step: StepResult = { raw: action.raw, status: 'passed', duration: 0 }
    try {
      await executeAction(page, action, baseUrl)
      step.duration = Date.now() - start

      if (config.screenshots === 'always') {
        const screenshotDir = path.join(process.cwd(), 'results', 'screenshots')
        fs.mkdirSync(screenshotDir, { recursive: true })
        const p = path.join(screenshotDir, `step-${Date.now()}.png`)
        await page.screenshot({ path: p })
        step.screenshot = p
      }
    } catch (err) {
      step.status = 'failed'
      step.duration = Date.now() - start
      step.error = err instanceof Error ? err.message : String(err)
      steps.push(step)
      throw err
    }
    steps.push(step)
  }
}

async function runAssertionList(
  page: Page,
  assertions: ReturnType<typeof Array.prototype.slice>[0][],
  steps: StepResult[],
  config: AxtestConfig,
  options: RunOptions,
): Promise<void> {
  for (const assertion of assertions) {
    const start = Date.now()
    const step: StepResult = { raw: assertion.raw, status: 'passed', duration: 0 }
    try {
      await executeAssertion(page, assertion)
      step.duration = Date.now() - start
    } catch (err) {
      step.status = 'failed'
      step.duration = Date.now() - start
      step.error = err instanceof Error ? err.message : String(err)
      steps.push(step)
      throw err
    }
    steps.push(step)
  }
}
