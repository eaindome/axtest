import * as path from 'path'
import * as fs from 'fs'
import type {
  FileContext, TestSpec, StepGroup,
  Action, Assertion,
} from '../types/index.js'

// ─── Public API ──────────────────────────────────────────────────────────────

export function parseFile(filePath: string): FileContext {
  const content = fs.readFileSync(filePath, 'utf-8')
  return parseContent(content, filePath)
}

export function parseContent(content: string, filePath = '<inline>'): FileContext {
  const lines = content.split('\n')
  const cleaned = lines.map(l => stripInlineComment(l).trim())
  const sections = splitBySeparator(cleaned)

  const header = parseFileHeader(sections[0])
  const tests = sections.slice(1).flatMap(parseTestBlock)

  return { filePath, ...header, tests }
}

// ─── File header ─────────────────────────────────────────────────────────────

function parseFileHeader(lines: string[]): Pick<FileContext, 'auth' | 'module'> {
  let auth: string | undefined
  let module: string | undefined

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const a = line.match(/^AUTH\s+(\S+)$/)
    if (a) { auth = a[1]; continue }
    const m = line.match(/^MODULE\s+(\S+)$/)
    if (m) { module = m[1]; continue }
  }

  return { auth, module }
}

// ─── Test block ──────────────────────────────────────────────────────────────

function parseTestBlock(lines: string[]): TestSpec[] {
  const nonEmpty = lines.filter(l => l && !l.startsWith('#'))
  if (nonEmpty.length === 0) return []

  const firstTest = nonEmpty.findIndex(l => l.startsWith('TEST '))
  if (firstTest === -1) return []

  // Parse the TEST header line: TEST id: description
  const headerLine = nonEmpty[firstTest]
  const headerMatch = headerLine.match(/^TEST\s+([^:]+):\s*(.+)$/)
  if (!headerMatch) {
    throw new ParseError(`Invalid TEST declaration: "${headerLine}"`)
  }

  const id = headerMatch[1].trim()
  const description = headerMatch[2].trim()

  // Parse optional AUTH override and DEPENDS ON after TEST line
  let auth: string | undefined
  const dependsOn: string[] = []
  let i = firstTest + 1

  while (i < nonEmpty.length) {
    const line = nonEmpty[i]
    const authOverride = line.match(/^AUTH\s+(\S+)$/)
    if (authOverride) { auth = authOverride[1]; i++; continue }
    const depends = line.match(/^DEPENDS ON\s+(.+)$/)
    if (depends) {
      dependsOn.push(...depends[1].split(',').map(s => s.trim()))
      i++; continue
    }
    break
  }

  // Parse remaining block sections: SETUP, STEPS, ASSERT (can repeat)
  const remaining = nonEmpty.slice(i)
  const { setup, stepGroups } = parseBlocks(remaining)

  return [{ id, description, auth, dependsOn: dependsOn.length ? dependsOn : undefined, setup, stepGroups }]
}

// ─── Block parsing ───────────────────────────────────────────────────────────

type BlockType = 'SETUP' | 'STEPS' | 'ASSERT'

function parseBlocks(lines: string[]): { setup: Action[]; stepGroups: StepGroup[] } {
  const setup: Action[] = []
  const stepGroups: StepGroup[] = []

  let currentBlock: BlockType | null = null
  let currentSteps: Action[] = []
  let currentAssertions: Assertion[] = []

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue

    if (line === 'SETUP') { currentBlock = 'SETUP'; continue }
    if (line === 'STEPS') {
      // Commit the current group before starting a new STEPS block
      // (supports multiple STEPS/ASSERT pairs within one test)
      if (currentSteps.length > 0 || currentAssertions.length > 0) {
        stepGroups.push({ steps: currentSteps, assertions: currentAssertions })
        currentSteps = []
        currentAssertions = []
      }
      currentBlock = 'STEPS'
      continue
    }
    if (line === 'ASSERT') {
      currentBlock = 'ASSERT'
      continue
    }

    // Switching from ASSERT back to STEPS closes the current step group
    if (currentBlock === null) continue

    if (currentBlock === 'SETUP') {
      const action = parseActionLine(line)
      if (action) setup.push(action)
    } else if (currentBlock === 'STEPS') {
      const action = parseActionLine(line)
      if (action) currentSteps.push(action)
    } else if (currentBlock === 'ASSERT') {
      const assertion = parseAssertionLine(line)
      if (assertion) currentAssertions.push(assertion)

      // Peek ahead — if next non-empty line is STEPS, commit this group
      // We commit when we see the next STEPS or reach end of block
    }
  }

  // Commit final step group if there are steps
  if (currentSteps.length > 0 || currentAssertions.length > 0) {
    stepGroups.push({ steps: currentSteps, assertions: currentAssertions })
  }

  return { setup, stepGroups }
}

// ─── Action parsing ───────────────────────────────────────────────────────────

// Order matters — more specific patterns before generic ones
const ACTION_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpMatchArray, raw: string) => Action }> = [
  // Navigation
  { re: /^navigate to "(.+)"$/, parse: (m, raw) => ({ type: 'navigate', path: resolveVar(m[1]), raw }) },
  { re: /^go back$/, parse: (_, raw) => ({ type: 'go_back', raw }) },
  { re: /^refresh page$/, parse: (_, raw) => ({ type: 'refresh', raw }) },

  // Click — specific scopes first
  { re: /^click tab "(.+)"$/, parse: (m, raw) => ({ type: 'click_tab', target: m[1], raw }) },
  { re: /^double click "(.+)"$/, parse: (m, raw) => ({ type: 'double_click', target: m[1], raw }) },
  { re: /^click "(.+)" in sidebar$/, parse: (m, raw) => ({ type: 'click', target: m[1], scope: 'sidebar', raw }) },
  { re: /^click "(.+)" in action bar$/, parse: (m, raw) => ({ type: 'click', target: m[1], scope: 'actionBar', raw }) },
  { re: /^click "(.+)" in modal$/, parse: (m, raw) => ({ type: 'click', target: m[1], scope: 'modal', raw }) },
  { re: /^click "(.+)" in breadcrumb$/, parse: (m, raw) => ({ type: 'click', target: m[1], scope: 'breadcrumb', raw }) },
  { re: /^click "(.+)" in row "(.+)"$/, parse: (m, raw) => ({ type: 'click', target: m[1], scope: 'row', context: m[2], raw }) },
  { re: /^click "(.+)"$/, parse: (m, raw) => ({ type: 'click', target: m[1], raw }) },

  // Action menus
  { re: /^open action menu in first row of "(.+)"$/, parse: (m, raw) => ({ type: 'open_action_menu', scope: 'first_row', table: m[1], raw }) },
  { re: /^open action menu for "(.+)"$/, parse: (m, raw) => ({ type: 'open_action_menu', context: m[1], raw }) },

  // Type — specific first
  { re: /^type "(.+)" into first "(.+)"$/, parse: (m, raw) => ({ type: 'type', value: resolveVar(m[1]), target: m[2], position: 'first', raw }) },
  { re: /^type "(.+)" into "(.+)" and press (\w+)$/, parse: (m, raw) => ({ type: 'type', value: resolveVar(m[1]), target: m[2], pressAfter: m[3], raw }) },
  { re: /^type "(.+)" into "(.+)"$/, parse: (m, raw) => ({ type: 'type', value: resolveVar(m[1]), target: m[2], raw }) },
  { re: /^clear "(.+)"$/, parse: (m, raw) => ({ type: 'clear', target: m[1], raw }) },

  // Select
  { re: /^select first from "(.+)"$/, parse: (m, raw) => ({ type: 'select', option: '__first__', target: m[1], raw }) },
  { re: /^select "(.+)" from "(.+)"$/, parse: (m, raw) => ({ type: 'select', option: resolveVar(m[1]), target: m[2], raw }) },

  // Check/Uncheck
  { re: /^check first in "(.+)"$/, parse: (m, raw) => ({ type: 'check', target: m[1], position: 'first', raw }) },
  { re: /^check "(.+)"$/, parse: (m, raw) => ({ type: 'check', target: m[1], raw }) },
  { re: /^uncheck "(.+)"$/, parse: (m, raw) => ({ type: 'uncheck', target: m[1], raw }) },

  // Wait
  { re: /^wait for page to load$/, parse: (_, raw) => ({ type: 'wait', condition: 'page_load', raw }) },
  { re: /^wait for "(.+)" to appear$/, parse: (m, raw) => ({ type: 'wait', target: m[1], condition: 'appear', raw }) },
  { re: /^wait for "(.+)" to disappear$/, parse: (m, raw) => ({ type: 'wait', target: m[1], condition: 'disappear', raw }) },
  // wait for "X" <qualifier> to appear/disappear (e.g. "wait for "Programme" list to appear")
  { re: /^wait for "(.+)" \w+ to appear$/, parse: (m, raw) => ({ type: 'wait', target: m[1], condition: 'appear', raw }) },
  { re: /^wait for "(.+)" \w+ to disappear$/, parse: (m, raw) => ({ type: 'wait', target: m[1], condition: 'disappear', raw }) },

  // Upload
  { re: /^upload "(.+)" to upload zone$/, parse: (m, raw) => ({ type: 'upload', file: m[1], target: null, raw }) },
  { re: /^upload "(.+)" to "(.+)"$/, parse: (m, raw) => ({ type: 'upload', file: m[1], target: m[2], raw }) },

  // Keyboard / Dialog / Scroll / Hover
  { re: /^press "(.+)"$/, parse: (m, raw) => ({ type: 'press', key: m[1], raw }) },
  { re: /^confirm dialog$/, parse: (_, raw) => ({ type: 'confirm_dialog', raw }) },
  { re: /^dismiss dialog$/, parse: (_, raw) => ({ type: 'dismiss_dialog', raw }) },
  { re: /^scroll to "(.+)"$/, parse: (m, raw) => ({ type: 'scroll', target: m[1], raw }) },
  { re: /^hover over "(.+)"$/, parse: (m, raw) => ({ type: 'hover', target: m[1], raw }) },

  // SETUP-specific selectors (more semantic, for preconditions)
  // Variant with extra qualifier: "select first budget with status "X" and <qualifier> from <source>"
  { re: /^select first (\w+) with status "(.+)" and .+ from (.+)$/, parse: (m, raw) => ({ type: 'setup_select', entityType: m[1], status: m[2], from: m[3].trim(), raw }) },
  { re: /^select first (\w+) with status "(.+)" from (.+)$/, parse: (m, raw) => ({ type: 'setup_select', entityType: m[1], status: m[2], from: m[3].trim(), raw }) },
  { re: /^select any (\w+) from (.+)$/, parse: (m, raw) => ({ type: 'setup_select', entityType: m[1], from: m[2].trim(), raw }) },
]

export function parseActionLine(line: string): Action | null {
  const raw = line
  for (const { re, parse } of ACTION_PATTERNS) {
    const m = line.match(re)
    if (m) return parse(m, raw)
  }
  throw new ParseError(`Unknown action: "${line}"`)
}

// ─── Assertion parsing ────────────────────────────────────────────────────────

const ASSERTION_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpMatchArray, raw: string) => Assertion }> = [
  // Visibility with scope — specific first
  { re: /^"(.+)" is visible in action bar$/, parse: (m, raw) => ({ type: 'is_visible', target: m[1], scope: 'actionBar', raw }) },
  { re: /^"(.+)" is not visible in action bar$/, parse: (m, raw) => ({ type: 'is_not_visible', target: m[1], scope: 'actionBar', raw }) },
  { re: /^"(.+)" is visible in sidebar$/, parse: (m, raw) => ({ type: 'is_visible', target: m[1], scope: 'sidebar', raw }) },
  { re: /^"(.+)" is visible in breadcrumb$/, parse: (m, raw) => ({ type: 'is_visible', target: m[1], scope: 'breadcrumb', raw }) },

  // Tab assertions
  { re: /^"(.+)" tab is visible$/, parse: (m, raw) => ({ type: 'is_visible', target: m[1], kind: 'tab', raw }) },
  { re: /^"(.+)" tab is not visible$/, parse: (m, raw) => ({ type: 'is_not_visible', target: m[1], kind: 'tab', raw }) },
  { re: /^"(.+)" tab is active$/, parse: (m, raw) => ({ type: 'is_active', target: m[1], kind: 'tab', raw }) },
  { re: /^"(.+)" tab contains (?:new )?entry$/, parse: (m, raw) => ({ type: 'has_entry', target: m[1], kind: 'tab', raw }) },

  // Basic visibility
  { re: /^"(.+)" is visible$/, parse: (m, raw) => ({ type: 'is_visible', target: m[1], raw }) },
  { re: /^"(.+)" is not visible$/, parse: (m, raw) => ({ type: 'is_not_visible', target: m[1], raw }) },

  // State
  { re: /^"(.+)" is enabled$/, parse: (m, raw) => ({ type: 'is_enabled', target: m[1], raw }) },
  { re: /^"(.+)" is disabled$/, parse: (m, raw) => ({ type: 'is_disabled', target: m[1], raw }) },
  { re: /^"(.+)" is checked$/, parse: (m, raw) => ({ type: 'is_checked', target: m[1], raw }) },

  // Modal
  { re: /^modal is open$/, parse: (_, raw) => ({ type: 'modal_is_open', raw }) },
  { re: /^modal is closed$/, parse: (_, raw) => ({ type: 'modal_is_closed', raw }) },
  { re: /^modal stays open$/, parse: (_, raw) => ({ type: 'modal_stays_open', raw }) },

  // Scoped content — specific before generic
  { re: /^"(.+)" in "(.+)" equals "(.+)"$/, parse: (m, raw) => ({ type: 'equals', target: m[1], scope: m[2], expected: m[3], raw }) },
  { re: /^"(.+)" in "(.+)" contains "(.+)"$/, parse: (m, raw) => ({ type: 'contains', target: m[1], scope: m[2], expected: m[3], raw }) },
  { re: /^"(.+)" in "(.+)" shows "(.+)"$/, parse: (m, raw) => ({ type: 'shows', target: m[1], scope: m[2], expected: m[3], raw }) },
  { re: /^"(.+)" in sidebar shows "(.+)"$/, parse: (m, raw) => ({ type: 'shows', target: m[1], scope: 'sidebar', expected: m[2], raw }) },

  // Content — quoted target
  { re: /^"(.+)" does not equal "(.+)"$/, parse: (m, raw) => ({ type: 'not_equals', target: m[1], expected: m[2], raw }) },
  { re: /^"(.+)" does not contain "(.+)"$/, parse: (m, raw) => ({ type: 'not_contains', target: m[1], expected: m[2], raw }) },
  { re: /^"(.+)" equals "(.+)"$/, parse: (m, raw) => ({ type: 'equals', target: m[1], expected: m[2], raw }) },
  { re: /^"(.+)" contains "(.+)"$/, parse: (m, raw) => ({ type: 'contains', target: m[1], expected: m[2], raw }) },

  // Toast
  { re: /^toast shows "(.+)"$/, parse: (m, raw) => ({ type: 'toast_shows', expected: m[1], raw }) },
  { re: /^toast contains "(.+)"$/, parse: (m, raw) => ({ type: 'toast_contains', expected: m[1], raw }) },

  // Error
  { re: /^form error shows "(.+)"$/, parse: (m, raw) => ({ type: 'form_error', expected: m[1], raw }) },
  { re: /^error shows "(.+)"$/, parse: (m, raw) => ({ type: 'error_shows', expected: m[1], raw }) },

  // Count
  { re: /^count of "(.+)" is (\d+)$/, parse: (m, raw) => ({ type: 'count_is', target: m[1], count: parseInt(m[2], 10), raw }) },
  { re: /^"(.+)" (?:tab )?row count decreases by (\d+)$/, parse: (m, raw) => ({ type: 'count_decreases', target: m[1], by: parseInt(m[2], 10), raw }) },

  // URL / Navigation
  { re: /^url is "(.+)"$/, parse: (m, raw) => ({ type: 'url_is', expected: m[1], raw }) },
  { re: /^url contains "(.+)"$/, parse: (m, raw) => ({ type: 'url_contains', expected: m[1], raw }) },
  { re: /^page redirects to "(.+)"$/, parse: (m, raw) => ({ type: 'redirects_to', expected: m[1], raw }) },

  // Unquoted target patterns — must come last to avoid shadowing specific keywords above
  // (e.g. "status badge equals "PENDING"" / "left panel contains "PENDING"")
  { re: /^(.+) does not equal "(.+)"$/, parse: (m, raw) => ({ type: 'not_equals', target: m[1].trim(), expected: m[2], raw }) },
  { re: /^(.+) equals "(.+)"$/, parse: (m, raw) => ({ type: 'equals', target: m[1].trim(), expected: m[2], raw }) },
  { re: /^(.+) contains "(.+)"$/, parse: (m, raw) => ({ type: 'contains', target: m[1].trim(), expected: m[2], raw }) },
  // Unquoted target + unquoted scope: "all requirements show "verified" in checklist"
  { re: /^(.+) shows? "(.+)" in (\w[\w\s]*)$/, parse: (m, raw) => ({ type: 'shows', target: m[1].trim(), expected: m[2], scope: m[3].trim(), raw }) },
  // Unquoted target no scope: "attachment badge shows "1 Document""
  { re: /^(.+) shows? "(.+)"$/, parse: (m, raw) => ({ type: 'shows', target: m[1].trim(), expected: m[2], raw }) },
  // Visual indicator: ""Approved Fees" shows failure indicator"
  { re: /^"(.+)" shows (\w+) indicator$/, parse: (m, raw) => ({ type: 'shows_indicator', target: m[1], indicator: m[2], raw }) },
]

export function parseAssertionLine(line: string): Assertion | null {
  const raw = line
  for (const { re, parse } of ASSERTION_PATTERNS) {
    const m = line.match(re)
    if (m) return parse(m, raw)
  }
  throw new ParseError(`Unknown assertion: "${line}"`)
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function splitBySeparator(lines: string[]): string[][] {
  const sections: string[][] = [[]]
  for (const line of lines) {
    if (line === '---') {
      sections.push([])
    } else {
      sections[sections.length - 1].push(line)
    }
  }
  return sections
}

function stripInlineComment(line: string): string {
  // Strip inline comments but preserve # inside quoted strings
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuote = !inQuote
    if (line[i] === '#' && !inQuote) return line.slice(0, i)
  }
  return line
}

// Resolves {{VAR_NAME}} from process.env at parse time
function resolveVar(value: string): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const envVal = process.env[name] ?? process.env[name.toUpperCase()]
    return envVal ?? `{{${name}}}`
  })
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}
