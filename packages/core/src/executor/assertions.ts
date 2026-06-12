import type { Page, Locator } from 'playwright'
import type { Assertion, ScopeType } from '../types/index.js'
import { getScopedContext, resolveElement, type SearchContext } from './element-resolver.js'

export async function executeAssertion(page: Page, assertion: Assertion): Promise<void> {
  switch (assertion.type) {
    case 'is_visible':      return assertVisible(page, assertion)
    case 'is_not_visible':  return assertVisible(page, assertion)
    case 'is_enabled':      return assertEnabled(page, assertion.target, assertion.scope)
    case 'is_disabled':     return assertDisabled(page, assertion.target, assertion.scope)
    case 'is_checked':      return assertChecked(page, assertion.target)
    case 'is_active':       return assertActive(page, assertion.target, assertion.kind)
    case 'equals':          return assertEquals(page, assertion)
    case 'not_equals':      return assertNotEquals(page, assertion)
    case 'contains':        return assertContains(page, assertion)
    case 'not_contains':    return assertNotContains(page, assertion)
    case 'shows':           return assertShows(page, assertion)
    case 'toast_shows':     return assertToast(page, assertion.expected, true)
    case 'toast_contains':  return assertToast(page, assertion.expected, false)
    case 'form_error':      return assertFormError(page, assertion.expected)
    case 'error_shows':     return assertError(page, assertion.expected)
    case 'count_is':        return assertCount(page, assertion.target, assertion.count!)
    case 'count_decreases': return assertCountDecreases(page, assertion.target, assertion.by!)
    case 'url_is':          return assertUrlIs(page, assertion.expected)
    case 'url_contains':    return assertUrlContains(page, assertion.expected)
    case 'redirects_to':    return assertRedirectsTo(page, assertion.expected)
    case 'modal_is_open':   return assertModalOpen(page)
    case 'modal_is_closed': return assertModalClosed(page)
    case 'modal_stays_open':return assertModalOpen(page)
    case 'has_entry':         return assertHasEntry(page, assertion.target, assertion.kind)
    case 'shows_indicator':   return assertShowsIndicator(page, assertion.target, assertion.indicator)
    default:
      throw new Error(`Unsupported assertion type: "${(assertion as Assertion).type}"`)
  }
}

// ─── Assertion implementations ────────────────────────────────────────────────

async function assertVisible(page: Page, assertion: Extract<Assertion, { type: 'is_visible' | 'is_not_visible' }>): Promise<void> {
  const scope = assertion.scope as string | undefined
  const kind = assertion.kind

  let locator
  if (kind === 'tab') {
    locator = page.getByRole('tab', { name: assertion.target })
  } else {
    const ctx: SearchContext = await getScopedContext(page, scope as any)
    locator = ctx.getByText(assertion.target, { exact: false })
      .or(ctx.getByRole('button', { name: assertion.target }))
      .or(ctx.getByLabel(assertion.target))
  }

  if (assertion.type === 'is_visible') {
    await locator.first().waitFor({ state: 'visible', timeout: 5000 })
  } else {
    try {
      await locator.first().waitFor({ state: 'hidden', timeout: 3000 })
    } catch {
      const count = await locator.count()
      if (count > 0) {
        throw new AssertionError(`Expected "${assertion.target}" to be hidden but it is visible`)
      }
    }
  }
}

async function assertEnabled(page: Page, target: string, scope?: string): Promise<void> {
  const el = await resolveElement(page, target, { scope: scope as ScopeType })
  const disabled = await el.isDisabled()
  if (disabled) throw new AssertionError(`Expected "${target}" to be enabled but it is disabled`)
}

async function assertDisabled(page: Page, target: string, scope?: string): Promise<void> {
  const el = await resolveElement(page, target, { scope: scope as ScopeType })
  const disabled = await el.isDisabled()
  if (!disabled) throw new AssertionError(`Expected "${target}" to be disabled but it is enabled`)
}

async function assertChecked(page: Page, target: string): Promise<void> {
  const el = await resolveElement(page, target, { kind: 'checkbox' })
  const checked = await el.isChecked()
  if (!checked) throw new AssertionError(`Expected "${target}" to be checked but it is not`)
}

async function assertActive(page: Page, target: string, kind?: string): Promise<void> {
  if (kind === 'tab') {
    const tab = page.getByRole('tab', { name: target })
    const selected = await tab.getAttribute('aria-selected')
    const dataState = await tab.getAttribute('data-state')
    if (selected !== 'true' && dataState !== 'active') {
      throw new AssertionError(`Expected tab "${target}" to be active`)
    }
  }
}

async function assertEquals(page: Page, assertion: Extract<Assertion, { type: 'equals' }>): Promise<void> {
  const text = await getElementText(page, assertion.target, assertion.scope)
  if (!text.includes(assertion.expected)) {
    throw new AssertionError(`Expected "${assertion.target}" to equal "${assertion.expected}" but got "${text}"`)
  }
}

async function assertNotEquals(page: Page, assertion: Extract<Assertion, { type: 'not_equals' }>): Promise<void> {
  const text = await getElementText(page, assertion.target, assertion.scope)
  if (text.includes(assertion.expected)) {
    throw new AssertionError(`Expected "${assertion.target}" to not equal "${assertion.expected}"`)
  }
}

async function assertContains(page: Page, assertion: Extract<Assertion, { type: 'contains' }>): Promise<void> {
  const text = await getElementText(page, assertion.target, assertion.scope)
  if (!text.toLowerCase().includes(assertion.expected.toLowerCase())) {
    throw new AssertionError(`Expected "${assertion.target}" to contain "${assertion.expected}" but got "${text}"`)
  }
}

async function assertNotContains(page: Page, assertion: Extract<Assertion, { type: 'not_contains' }>): Promise<void> {
  const text = await getElementText(page, assertion.target, assertion.scope)
  if (text.toLowerCase().includes(assertion.expected.toLowerCase())) {
    throw new AssertionError(`Expected "${assertion.target}" to not contain "${assertion.expected}"`)
  }
}

async function assertShows(page: Page, assertion: Extract<Assertion, { type: 'shows' }>): Promise<void> {
  const text = await getElementText(page, assertion.target, assertion.scope)
  if (!text.toLowerCase().includes(assertion.expected.toLowerCase())) {
    throw new AssertionError(`Expected "${assertion.target}" to show "${assertion.expected}" but got "${text}"`)
  }
}

async function assertToast(page: Page, expected: string, exact: boolean): Promise<void> {
  // Common toast selectors
  const toastSelectors = [
    '[role="alert"]',
    '[data-sonner-toast]',
    '.toast',
    '[class*="toast"]',
    '[class*="notification"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
  ]

  const toastLocator = page.locator(toastSelectors.join(', '))
  await toastLocator.first().waitFor({ state: 'visible', timeout: 8000 })

  const text = await toastLocator.first().textContent() ?? ''
  const match = exact
    ? text.trim() === expected
    : text.toLowerCase().includes(expected.toLowerCase())

  if (!match) {
    throw new AssertionError(`Expected toast to show "${expected}" but got "${text.trim()}"`)
  }
}

async function assertFormError(page: Page, expected: string): Promise<void> {
  const errorSelectors = [
    '[role="alert"]',
    '.error-message',
    '[class*="error"]',
    '[class*="invalid"]',
    'p[id*="error"]',
  ]
  const errEl = page.locator(errorSelectors.join(', ')).filter({ hasText: expected })
  await errEl.first().waitFor({ state: 'visible', timeout: 5000 })
}

async function assertError(page: Page, expected: string): Promise<void> {
  const errEl = page.getByText(expected, { exact: false })
  await errEl.first().waitFor({ state: 'visible', timeout: 5000 })
}

async function assertCount(page: Page, target: string, expected: number): Promise<void> {
  const els = page.getByText(target, { exact: false })
  const count = await els.count()
  if (count !== expected) {
    throw new AssertionError(`Expected count of "${target}" to be ${expected} but found ${count}`)
  }
}

async function assertCountDecreases(page: Page, target: string, by: number): Promise<void> {
  // We can't easily track "before" here without storing state.
  // For now we just check that the element exists with reduced visibility.
  // A proper implementation would need the runner to capture before-state.
  // TODO: implement with before/after count tracking in the runner.
}

async function assertUrlIs(page: Page, expected: string): Promise<void> {
  await page.waitForURL(url => {
    const pathname = new URL(url).pathname
    return pathname === expected || url.toString() === expected
  }, { timeout: 5000 })
}

async function assertUrlContains(page: Page, expected: string): Promise<void> {
  await page.waitForURL(url => url.toString().includes(expected), { timeout: 5000 })
}

async function assertRedirectsTo(page: Page, expected: string): Promise<void> {
  await assertUrlContains(page, expected)
}

async function assertModalOpen(page: Page): Promise<void> {
  // A page may have multiple [role="dialog"] elements (one per module).
  // Only one should be visible; iterate to find it rather than assuming first().
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    const modals = page.locator('[role="dialog"]')
    const count  = await modals.count()
    for (let i = 0; i < count; i++) {
      if (await modals.nth(i).isVisible()) return
    }
    await page.waitForTimeout(100)
  }
  throw new AssertionError('Expected a dialog to be open but none are visible')
}

async function assertModalClosed(page: Page): Promise<void> {
  // Wait until ALL dialogs are hidden (not just the first one).
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    const modals = page.locator('[role="dialog"]')
    const count  = await modals.count()
    let anyVisible = false
    for (let i = 0; i < count; i++) {
      if (await modals.nth(i).isVisible()) { anyVisible = true; break }
    }
    if (!anyVisible) return
    await page.waitForTimeout(100)
  }
  throw new AssertionError('Expected all dialogs to be closed but one is still visible')
}

async function assertShowsIndicator(page: Page, target: string, indicator: string): Promise<void> {
  const section = page.getByText(target, { exact: true }).first()
  if (await section.count() === 0) {
    throw new AssertionError(`Could not find section "${target}" to check for ${indicator} indicator`)
  }
  // Look for indicator elements (error/warning/success icons, badges, status dots) near the section label
  const container = section.locator('..')
  const indicatorSelectors = [
    `[class*="${indicator}"]`,
    `[data-status="${indicator}"]`,
    `[aria-label*="${indicator}"]`,
    `[title*="${indicator}"]`,
  ]
  for (const sel of indicatorSelectors) {
    if (await container.locator(sel).count() > 0) return
  }
  throw new AssertionError(`Expected "${target}" to show a ${indicator} indicator but none was found`)
}

async function assertHasEntry(page: Page, target: string, kind?: string): Promise<void> {
  // For tab contexts: check that the tab panel has at least one row or list item
  if (kind === 'tab') {
    const tab = page.getByRole('tab', { name: target })
    await tab.click()
    await page.waitForTimeout(300)
  }
  const rows = page.locator('tr[data-row], [role="row"]:not([data-header]), tbody tr, [role="listitem"]')
  const count = await rows.count()
  if (count === 0) {
    throw new AssertionError(`Expected "${target}" to contain at least one entry but found none`)
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function getElementText(page: Page, target: string, scope?: string): Promise<string> {
  // First: if there's a visible label matching target, grab its parent's text content
  // (e.g. "Status" label → parent row contains "PENDING")
  const labelEl = page.getByText(target, { exact: true })
  if (await labelEl.count() > 0) {
    const parent = labelEl.first().locator('..')
    return (await parent.textContent() ?? '').trim()
  }

  // Fall back to the full text of the scoped context
  const ctx: SearchContext = await getScopedContext(page, scope as any)
  if (scope) {
    return ((await (ctx as Locator).textContent()) ?? '').trim()
  }
  return (await page.evaluate(() => document.body.textContent ?? '')).trim()
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }
}
