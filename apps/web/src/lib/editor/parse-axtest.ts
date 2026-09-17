import type { ParsedFile, Rule, RuleType, Step, StepType, TestBlock, TestKind } from './types'
import { defaultAssertionBody, parseAssertion, serializeAssertion } from './parse-assertion'

export function makeStep(type: StepType = 'click'): Step {
  const step: Step = { id: crypto.randomUUID(), type, target: '', value: '', context: '', assertion: '' }
  if (type === 'assert') step.assertion = defaultAssertionBody()
  return step
}

export function makeRule(type: RuleType = 'field_required'): Rule {
  return { id: crypto.randomUUID(), type, target: '', value: '', value2: '' }
}

function makeTestBlock(name: string): TestBlock {
  return {
    id: crypto.randomUUID(),
    name,
    kind: '',
    generatedFrom: '',
    dependsOn: '',
    steps: [],
    asserts: [],
  }
}

const VALID_KINDS = new Set<TestKind>(['', 'seed', 'positive', 'negative', 'edge'])

export function parseRuleLine(line: string): Rule {
  const id = crypto.randomUUID()
  const trimmed = line.trim()
  if (!trimmed) return makeRule('note')

  let m = trimmed.match(/^field "(.+)" is required$/)
  if (m) return { id, type: 'field_required', target: m[1], value: '', value2: '' }

  m = trimmed.match(/^field "(.+)" must_be (\w+)$/)
  if (m) return { id, type: 'field_format', target: m[1], value: m[2], value2: '' }

  m = trimmed.match(/^field "(.+)" length between (\d+) and (\d+)$/)
  if (m) return { id, type: 'field_length', target: m[1], value: m[2], value2: m[3] }

  m = trimmed.match(/^field "(.+)" between (.+) and (.+)$/)
  if (m) return { id, type: 'field_range', target: m[1], value: m[2], value2: m[3] }

  m = trimmed.match(/^on (.+) show error "(.+)"$/)
  if (m) return { id, type: 'show_error', target: m[1], value: m[2], value2: '' }

  m = trimmed.match(/^url contains "(.+)"$/)
  if (m) return { id, type: 'url_contains', target: '', value: m[1], value2: '' }

  m = trimmed.match(/^element "(.+)" (is_visible|is_hidden)$/)
  if (m) return { id, type: 'element_visible', target: m[1], value: m[2], value2: '' }

  m = trimmed.match(/^element "(.+)" (is_enabled|is_disabled)$/)
  if (m) return { id, type: 'element_state', target: m[1], value: m[2], value2: '' }

  m = trimmed.match(/^note "(.+)"$/)
  if (m) return { id, type: 'note', target: '', value: m[1], value2: '' }

  return { id, type: 'note', target: '', value: trimmed, value2: '' }
}

export function serializeRule(r: Rule): string {
  switch (r.type) {
    case 'field_required':
      return `field "${r.target}" is required`
    case 'field_format':
      return `field "${r.target}" must_be ${r.value || 'email'}`
    case 'field_length':
      return `field "${r.target}" length between ${r.value || '1'} and ${r.value2 || '255'}`
    case 'field_range':
      return `field "${r.target}" between ${r.value || '0'} and ${r.value2 || '100'}`
    case 'show_error':
      return `on ${r.target || 'submit'} show error "${r.value}"`
    case 'url_contains':
      return `url contains "${r.value}"`
    case 'element_visible':
      return `element "${r.target}" ${r.value || 'is_visible'}`
    case 'element_state':
      return `element "${r.target}" ${r.value || 'is_enabled'}`
    case 'note':
      return r.value.includes('"') ? `note ${r.value}` : `note "${r.value}"`
  }
}

export function parseStep(line: string): Step {
  const s = makeStep()
  if (line.startsWith('navigate to ')) return { ...s, type: 'navigate', target: line.slice(12).trim() }
  if (line.startsWith('click ')) {
    const rest = line.slice(6)
    const inRow = rest.match(/^"(.+)" in row "(.+)"$/)
    if (inRow) return { ...s, type: 'click', target: inRow[1], context: inRow[2] }
    const inCtx = rest.match(/^"(.+)" in "(.+)"$/)
    if (inCtx) return { ...s, type: 'click', target: inCtx[1], context: inCtx[2] }
    const simple = rest.match(/^"(.+)"$/)
    if (simple) return { ...s, type: 'click', target: simple[1] }
    return { ...s, type: 'click', target: rest }
  }
  if (line.startsWith('type ')) {
    const m = line.slice(5).match(/^"(.+)" in "(.+)"$/)
    if (m) return { ...s, type: 'type', value: m[1], target: m[2] }
    return { ...s, type: 'type', value: line.slice(5) }
  }
  if (line.startsWith('select ')) {
    const m = line.slice(7).match(/^"(.+)" in "(.+)"$/)
    if (m) return { ...s, type: 'select', value: m[1], target: m[2] }
    return { ...s, type: 'select', value: line.slice(7) }
  }
  if (line.startsWith('clear ')) return { ...s, type: 'clear', target: line.slice(6).replace(/^"|"$/g, '') }
  if (line.startsWith('assert ')) {
    const body = line.slice(7)
    return { ...s, type: 'assert', assertion: body }
  }
  return { ...s, type: 'navigate', target: line }
}

export function parseAxtest(content: string): ParsedFile {
  const result: ParsedFile = { title: '', baseUrl: '', auth: '', rules: [], tests: [] }
  const lines = content.split('\n')
  let i = 0
  if (lines[i]?.trim() === '---') {
    i++
    let inRules = false
    while (i < lines.length && lines[i].trim() !== '---') {
      const t = lines[i].trim()
      if (t === 'rules:') {
        inRules = true
        i++
        continue
      }
      if (inRules) {
        if (t.startsWith('- ')) {
          result.rules.push(parseRuleLine(t.slice(2)))
          i++
          continue
        }
        inRules = false
      }
      if (t.startsWith('title:')) result.title = t.slice(6).trim()
      if (t.startsWith('base_url:')) result.baseUrl = t.slice(9).trim()
      i++
    }
    i++
  }

  let cur: TestBlock | null = null
  let section: 'steps' | 'asserts' | 'rules' | null = null
  let pendingRuleId: string | null = null
  let pendingStepId: string | null = null
  while (i < lines.length) {
    const t = lines[i].trim()
    if (t.startsWith('AUTH ')) {
      result.auth = t.slice(5).trim()
      section = null
    } else if (t === 'RULES') {
      section = 'rules'
    } else if (t.startsWith('TEST ')) {
      const name = t.slice(5).replace(/^"|"$/g, '')
      cur = makeTestBlock(name)
      result.tests.push(cur)
      section = null
    } else if (t.startsWith('ID ') && cur) {
      cur.id = t.slice(3).trim()
    } else if (t.startsWith('TAG ') && cur) {
      const kind = t.slice(4).trim() as TestKind
      if (VALID_KINDS.has(kind)) cur.kind = kind
    } else if (t.startsWith('GENERATED FROM ') && cur) {
      cur.generatedFrom = t.slice(15).replace(/^"|"$/g, '')
    } else if (t === 'STEPS') { section = 'steps' }
    else if (t === 'ASSERT') { section = 'asserts' }
    else if (t.startsWith('DEPENDS ON ') && cur) cur.dependsOn = t.slice(11).replace(/^"|"$/g, '')
    else if (t.startsWith('RULE_ID ')) {
      pendingRuleId = t.slice(8).trim()
    } else if (section === 'rules' && t) {
      const rule = parseRuleLine(t)
      if (pendingRuleId) {
        rule.id = pendingRuleId
        pendingRuleId = null
      }
      result.rules.push(rule)
    } else if (t.startsWith('STEP_ID ') && cur && (section === 'steps' || section === 'asserts')) {
      pendingStepId = t.slice(8).trim()
    } else if (t && cur && section === 'steps') {
      const step = parseStep(t)
      if (pendingStepId) {
        step.id = pendingStepId
        pendingStepId = null
      }
      cur.steps.push(step)
    } else if (t && cur && section === 'asserts') {
      const step = parseStep(t)
      if (pendingStepId) {
        step.id = pendingStepId
        pendingStepId = null
      }
      cur.asserts.push(step)
    }
    i++
  }
  return result
}

export function serializeStep(s: Step): string {
  switch (s.type) {
    case 'navigate': return `navigate to ${s.target}`
    case 'click':    return s.context ? `click "${s.target}" in row "${s.context}"` : `click "${s.target}"`
    case 'type':     return `type "${s.value}" in "${s.target}"`
    case 'select':   return `select "${s.value}" in "${s.target}"`
    case 'clear':    return `clear "${s.target}"`
    case 'assert': {
      const parsed = parseAssertion(s.assertion)
      return `assert ${serializeAssertion(parsed)}`
    }
  }
}

export function serializeAxtest(p: ParsedFile): string {
  const out: string[] = ['---']
  if (p.title) out.push(`title: ${p.title}`)
  if (p.baseUrl) out.push(`base_url: ${p.baseUrl}`)
  out.push('---', '')
  if (p.auth) out.push(`AUTH ${p.auth}`, '')
  if (p.rules.length) {
    out.push('RULES')
    for (const r of p.rules) {
      out.push(`  RULE_ID ${r.id}`)
      out.push(`  ${serializeRule(r)}`)
    }
    out.push('')
  }
  for (const t of p.tests) {
    out.push(`TEST "${t.name}"`)
    out.push(`  ID ${t.id}`)
    if (t.kind) out.push(`  TAG ${t.kind}`)
    if (t.generatedFrom) out.push(`  GENERATED FROM "${t.generatedFrom}"`)
    if (t.dependsOn) out.push(`  DEPENDS ON "${t.dependsOn}"`)
    out.push('  STEPS')
    for (const s of t.steps) {
      out.push(`    STEP_ID ${s.id}`)
      out.push(`    ${serializeStep(s)}`)
    }
    out.push('  ASSERT')
    for (const s of t.asserts) {
      out.push(`    STEP_ID ${s.id}`)
      out.push(`    ${serializeStep(s)}`)
    }
    out.push('')
  }
  return out.join('\n').trimEnd()
}
