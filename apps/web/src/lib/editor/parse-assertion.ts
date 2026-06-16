import type { AssertionType } from './types'

export interface StructuredAssertion {
  type: AssertionType
  target: string
  value: string
}

export function parseAssertion(body: string): StructuredAssertion {
  const trimmed = body.trim()
  if (!trimmed) return { type: 'is_visible', target: '', value: '' }

  if (trimmed === 'modal is open') {
    return { type: 'modal_open', target: '', value: '' }
  }

  let m = trimmed.match(/^"(.*)" is_visible$/)
  if (m) return { type: 'is_visible', target: m[1], value: '' }

  m = trimmed.match(/^"(.*)" is_not_visible$/)
  if (m) return { type: 'is_not_visible', target: m[1], value: '' }

  m = trimmed.match(/^"(.*)" is_enabled$/)
  if (m) return { type: 'is_enabled', target: m[1], value: '' }

  m = trimmed.match(/^"(.*)" is_disabled$/)
  if (m) return { type: 'is_disabled', target: m[1], value: '' }

  m = trimmed.match(/^"(.*)" contains "(.*)"$/)
  if (m) return { type: 'contains', target: m[1], value: m[2] }

  m = trimmed.match(/^toast shows "(.*)"$/)
  if (m) return { type: 'toast_shows', target: '', value: m[1] }

  m = trimmed.match(/^url contains "(.*)"$/)
  if (m) return { type: 'url_contains', target: '', value: m[1] }

  return { type: 'custom', target: '', value: trimmed }
}

export function serializeAssertion(a: StructuredAssertion): string {
  switch (a.type) {
    case 'is_visible':
      return `"${a.target}" is_visible`
    case 'is_not_visible':
      return `"${a.target}" is_not_visible`
    case 'is_enabled':
      return `"${a.target}" is_enabled`
    case 'is_disabled':
      return `"${a.target}" is_disabled`
    case 'contains':
      return `"${a.target}" contains "${a.value}"`
    case 'toast_shows':
      return `toast shows "${a.value}"`
    case 'url_contains':
      return `url contains "${a.value}"`
    case 'modal_open':
      return 'modal is open'
    case 'custom':
      return a.value
  }
}

export function validateAssertionBody(body: string): { severity: 'error' | 'warning'; message: string } | null {
  const trimmed = body.trim()
  if (!trimmed) {
    return { severity: 'error', message: 'Assertion cannot be empty' }
  }

  const parsed = parseAssertion(trimmed)
  if (parsed.type === 'custom') {
    return {
      severity: 'warning',
      message: 'Unrecognized assertion — try is_visible, contains, toast shows, url contains, or modal is open',
    }
  }

  if (parsed.type === 'is_visible' || parsed.type === 'is_not_visible'
    || parsed.type === 'is_enabled' || parsed.type === 'is_disabled') {
    if (!parsed.target.trim()) {
      return { severity: 'error', message: 'Assertion needs an element or label in quotes' }
    }
  }

  if (parsed.type === 'contains') {
    if (!parsed.target.trim()) {
      return { severity: 'error', message: 'Contains assertion needs an element or label' }
    }
    if (!parsed.value.trim()) {
      return { severity: 'warning', message: 'Contains assertion needs expected text' }
    }
  }

  if (parsed.type === 'toast_shows' || parsed.type === 'url_contains') {
    if (!parsed.value.trim()) {
      return { severity: 'error', message: `${parsed.type === 'toast_shows' ? 'Toast' : 'URL'} assertion needs a value in quotes` }
    }
  }

  return null
}

export function defaultAssertionBody(): string {
  return serializeAssertion({ type: 'is_visible', target: '', value: '' })
}
