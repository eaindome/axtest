import type { Diagnostic } from '@codemirror/lint'
import { validateAssertionBody } from './parse-assertion'

const KNOWN_ACTIONS = [
  'navigate to', 'click', 'type', 'select', 'clear', 'assert',
  'check', 'wait for', 'press', 'upload', 'confirm dialog', 'dismiss dialog',
  'select first from',
]

const BLOCK_KEYWORDS = ['TEST', 'STEPS', 'ASSERT', 'AUTH', 'MODULE', 'DEPENDS ON', 'RULES']

const RULE_LINE = /^(field |on |url |element |note )/

function lineAction(trimmed: string): string | null {
  const lower = trimmed.toLowerCase()
  for (const action of KNOWN_ACTIONS) {
    if (lower.startsWith(action)) return action
  }
  return null
}

function hasUnclosedQuote(text: string): boolean {
  const quotes = (text.match(/"/g) ?? []).length
  return quotes % 2 !== 0
}

export function validateAxtest(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const lines = content.split('\n')
  let inFrontmatter = false
  let inRulesList = false
  let inRulesSection = false
  let section: 'steps' | 'asserts' | null = null
  let currentTest: { line: number; hasSteps: boolean; hasAssert: boolean } | null = null

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    const trimmed = text.trim()
    const from = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
    const to = from + text.length

    if (trimmed === '---') {
      inFrontmatter = !inFrontmatter
      if (!inFrontmatter) inRulesList = false
      continue
    }

    if (!trimmed || trimmed.startsWith('#')) continue

    if (inFrontmatter) {
      if (trimmed === 'rules:') {
        inRulesList = true
        continue
      }
      if (inRulesList) {
        if (trimmed.startsWith('- ')) continue
        inRulesList = false
      }
      const validKey =
        trimmed.startsWith('title:') ||
        trimmed.startsWith('base_url:') ||
        trimmed === 'rules:' ||
        trimmed.startsWith('- ')
      if (!validKey && trimmed) {
        diagnostics.push({
          from, to,
          severity: 'warning',
          message: 'Unknown frontmatter key. Expected title:, base_url:, or rules:',
        })
      }
      continue
    }

    if (hasUnclosedQuote(trimmed)) {
      diagnostics.push({
        from, to,
        severity: 'error',
        message: 'Unclosed quote — every " must have a matching pair',
      })
    }

    const upper = trimmed.toUpperCase()

    if (upper.startsWith('TEST ')) {
      inRulesSection = false
      section = null
      if (currentTest && (!currentTest.hasSteps || !currentTest.hasAssert)) {
        const prevFrom = lines.slice(0, currentTest.line).join('\n').length + (currentTest.line > 0 ? 1 : 0)
        diagnostics.push({
          from: prevFrom,
          to: prevFrom + lines[currentTest.line].length,
          severity: 'warning',
          message: 'Test block is missing STEPS or ASSERT section',
        })
      }
      currentTest = { line: i, hasSteps: false, hasAssert: false }

      if (!trimmed.match(/^TEST\s+".+"$/)) {
        diagnostics.push({
          from, to,
          severity: 'warning',
          message: 'Test name should be quoted: TEST "My test name"',
        })
      }
      continue
    }

    if (trimmed === 'STEPS' && currentTest) {
      inRulesSection = false
      section = 'steps'
      currentTest.hasSteps = true
      continue
    }

    if (trimmed === 'ASSERT' && currentTest) {
      inRulesSection = false
      section = 'asserts'
      currentTest.hasAssert = true
      continue
    }

    if (trimmed === 'RULES') {
      inRulesSection = true
      section = null
      currentTest = null
      continue
    }

    if (inRulesSection && RULE_LINE.test(trimmed)) continue

    if (upper.startsWith('AUTH ') || upper.startsWith('MODULE ')) {
      inRulesSection = false
      section = null
      continue
    }

    if (upper.startsWith('DEPENDS ON') && !trimmed.match(/^DEPENDS ON\s+".+"$/)) {
      diagnostics.push({
        from, to,
        severity: 'warning',
        message: 'Dependency should be quoted: DEPENDS ON "Other test name"',
      })
      continue
    }

    if (trimmed.startsWith('ID ') || trimmed.startsWith('TAG ') || trimmed.startsWith('GENERATED FROM ')) continue

    if (BLOCK_KEYWORDS.includes(upper)) continue
    if (trimmed.startsWith('title:') || trimmed.startsWith('base_url:')) continue

    if (section === 'asserts') {
      if (!trimmed.startsWith('assert ')) {
        diagnostics.push({
          from, to,
          severity: 'error',
          message: 'ASSERT lines must start with assert — e.g. assert "Success" is_visible',
        })
        continue
      }
      const issue = validateAssertionBody(trimmed.slice(7))
      if (issue) diagnostics.push({ from, to, ...issue })
      continue
    }

    const action = lineAction(trimmed)
    if (!action) {
      if (/^[a-z]/.test(trimmed)) {
        diagnostics.push({
          from, to,
          severity: 'error',
          message: `Unknown action "${trimmed.split(/\s/)[0]}". Try: click, type, navigate to, assert…`,
        })
      }
      continue
    }

    if (action === 'click' && !trimmed.includes('"')) {
      diagnostics.push({
        from, to,
        severity: 'warning',
        message: 'Click target should be quoted: click "Button label"',
      })
    }

    if (action === 'type' && !trimmed.match(/type\s+".+"\s+in\s+".+"/)) {
      diagnostics.push({
        from, to,
        severity: 'warning',
        message: 'Type syntax: type "value" in "Field name"',
      })
    }

    if (action === 'assert') {
      const issue = validateAssertionBody(trimmed.slice(7))
      if (issue) diagnostics.push({ from, to, ...issue })
    }
  }

  if (currentTest && (!currentTest.hasSteps || !currentTest.hasAssert)) {
    const prevFrom = lines.slice(0, currentTest.line).join('\n').length + (currentTest.line > 0 ? 1 : 0)
    diagnostics.push({
      from: prevFrom,
      to: prevFrom + lines[currentTest.line].length,
      severity: 'warning',
      message: 'Test block is missing STEPS or ASSERT section',
    })
  }

  return diagnostics
}
