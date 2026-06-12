import type { Page, Locator, FrameLocator } from 'playwright'
import type { ScopeType } from '../types/index.js'

export type SearchContext = Page | Locator

// Scope selectors — reasonable defaults for common UI patterns
const SCOPE_SELECTORS: Record<ScopeType, string[]> = {
  sidebar:    ['nav', 'aside', '[role="navigation"]', '[data-sidebar]'],
  actionBar:  ['[role="toolbar"]', '[data-action-bar]', '.action-bar'],
  modal:      ['[role="dialog"]', '[data-modal]'],
  row:        ['tr', '[role="row"]'],
  breadcrumb: ['[aria-label*="breadcrumb" i]', '[role="navigation"][aria-label*="breadcrumb" i]', 'nav ol', 'nav ul'],
}

export async function getScopedContext(
  page: Page,
  scope?: ScopeType | string,
  context?: string,
): Promise<SearchContext> {
  if (!scope) return page

  if (scope === 'row' && context) {
    // Find the row containing the context text
    const row = page.locator('tr, [role="row"]').filter({ hasText: context })
    if (await row.count() > 0) return row.first()
    return page
  }

  // For modal scope: find the currently VISIBLE dialog, not just the first in DOM.
  // Pages may have multiple dialog elements (e.g. one per module) with only one visible.
  if (scope === 'modal') {
    const dialogs = page.locator('[role="dialog"], [data-modal]')
    const count = await dialogs.count()
    for (let i = 0; i < count; i++) {
      const d = dialogs.nth(i)
      if (await d.isVisible()) return d
    }
    return page
  }

  const selectors = SCOPE_SELECTORS[scope as ScopeType]
  if (!selectors) return page

  for (const sel of selectors) {
    const el = page.locator(sel)
    if (await el.count() > 0) return el.first()
  }

  return page
}

export async function resolveElement(
  page: Page,
  label: string,
  options: {
    scope?: ScopeType | string
    context?: string
    kind?: 'tab' | 'button' | 'link' | 'checkbox' | 'combobox'
    position?: 'first'
  } = {},
): Promise<Locator> {
  const ctx = await getScopedContext(page, options.scope, options.context)
  const { kind, position } = options

  // Resolution strategies in priority order
  const strategies: Array<() => Locator> = []

  if (kind === 'tab') {
    strategies.push(
      () => (ctx as Page).getByRole('tab', { name: label }),
    )
  } else if (kind === 'checkbox') {
    strategies.push(
      () => (ctx as Page).getByRole('checkbox', { name: label }),
      () => (ctx as Page).getByLabel(label),
    )
  } else if (kind === 'combobox') {
    strategies.push(
      () => (ctx as Page).getByRole('combobox', { name: label }),
      () => (ctx as Page).getByLabel(label),
    )
  } else {
    // General element resolution.
    // Use exact:true for role-based strategies so that e.g. clicking "Save" doesn't
    // accidentally match a button whose accessible name contains "Save" as a substring
    // (such as a kebab button labelled "Actions for Save Invoice" etc.).
    strategies.push(
      () => (ctx as Page).getByRole('button', { name: label, exact: true }),
      () => (ctx as Page).getByRole('link', { name: label, exact: true }),
      () => (ctx as Page).getByRole('menuitem', { name: label, exact: true }),
      () => (ctx as Page).getByText(label, { exact: true }),
      () => (ctx as Page).getByLabel(label),
      () => (ctx as Page).getByPlaceholder(label),
      () => (ctx as Page).getByTitle(label),
    )
  }

  for (const strategy of strategies) {
    try {
      const locator = strategy()
      const count = await locator.count()
      if (count > 0) {
        return locator.first()
      }
    } catch {
      // Strategy failed, try next
    }
  }

  // Build a helpful error message
  const scopeInfo = options.scope ? ` in ${options.scope}` : ''
  const contextInfo = options.context ? ` (row: "${options.context}")` : ''
  throw new ElementNotFoundError(label, scopeInfo + contextInfo)
}

export async function resolveInput(page: Page, label: string, position?: 'first'): Promise<Locator> {
  const strategies = [
    () => page.getByLabel(label, { exact: true }),
    () => page.getByLabel(label),
    () => page.getByPlaceholder(label),
    () => page.getByRole('textbox', { name: label }),
    () => page.getByRole('spinbutton', { name: label }),
  ]

  for (const strategy of strategies) {
    try {
      const locator = strategy()
      const count = await locator.count()
      if (count > 0) {
        if (position === 'first') return locator.first()
        return locator.first()
      }
    } catch {
      // Try next
    }
  }

  throw new ElementNotFoundError(label, ' (input)')
}

export async function resolveSelect(page: Page, label: string): Promise<Locator> {
  const strategies = [
    () => page.getByRole('combobox', { name: label }),
    () => page.getByLabel(label),
    () => page.locator('select').filter({ has: page.locator(`option:scope ~ label:text("${label}")`) }),
  ]

  for (const strategy of strategies) {
    try {
      const locator = strategy()
      const count = await locator.count()
      if (count > 0) return locator.first()
    } catch {
      // Try next
    }
  }

  throw new ElementNotFoundError(label, ' (select/combobox)')
}

export class ElementNotFoundError extends Error {
  constructor(label: string, context = '') {
    super(
      `Could not find element "${label}"${context}\n` +
      `  Tried: visible text, aria-label, label, placeholder, title\n` +
      `  Hint:  Check that the label matches exactly what is visible on screen.\n` +
      `         If the element uses only an icon, add an aria-label to it.`,
    )
    this.name = 'ElementNotFoundError'
  }
}
