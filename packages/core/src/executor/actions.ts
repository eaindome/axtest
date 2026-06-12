import type { Page } from 'playwright'
import type { Action } from '../types/index.js'
import {
  resolveElement,
  resolveInput,
  resolveSelect,
  ElementNotFoundError,
} from './element-resolver.js'

export async function executeAction(page: Page, action: Action, baseUrl: string): Promise<void> {
  switch (action.type) {
    case 'navigate':    return executeNavigate(page, action.path, baseUrl)
    case 'go_back':     return page.goBack().then(() => {})
    case 'refresh':     return page.reload().then(() => {})
    case 'click':       return executeClick(page, action)
    case 'click_tab':   return executeClickTab(page, action.target)
    case 'double_click':return executeDoubleClick(page, action.target)
    case 'type':        return executeType(page, action)
    case 'clear':       return executeClear(page, action.target)
    case 'select':      return executeSelect(page, action)
    case 'check':       return executeCheck(page, action)
    case 'uncheck':     return executeUncheck(page, action.target)
    case 'wait':        return executeWait(page, action)
    case 'upload':      return executeUpload(page, action)
    case 'press':       return page.keyboard.press(action.key)
    case 'confirm_dialog': return executeConfirmDialog(page)
    case 'dismiss_dialog': return executeDismissDialog(page)
    case 'scroll':      return executeScroll(page, action.target)
    case 'hover':       return executeHover(page, action.target)
    case 'open_action_menu': return executeOpenActionMenu(page, action)
    case 'setup_select': return executeSetupSelect(page, action)
    default:
      throw new Error(`Unsupported action type: "${(action as Action).type}"`)
  }
}

// ─── Action implementations ───────────────────────────────────────────────────

async function executeNavigate(page: Page, rawPath: string, baseUrl: string): Promise<void> {
  const url = rawPath.startsWith('http') ? rawPath : `${baseUrl.replace(/\/$/, '')}${rawPath}`
  await page.goto(url, { waitUntil: 'networkidle' })
}

async function executeClick(page: Page, action: Extract<Action, { type: 'click' }>): Promise<void> {
  const el = await resolveElement(page, action.target, {
    scope: action.scope,
    context: action.context,
  })
  await el.click()
}

async function executeClickTab(page: Page, target: string): Promise<void> {
  const el = await resolveElement(page, target, { kind: 'tab' })
  await el.click()
}

async function executeDoubleClick(page: Page, target: string): Promise<void> {
  const el = await resolveElement(page, target)
  await el.dblclick()
}

async function executeType(page: Page, action: Extract<Action, { type: 'type' }>): Promise<void> {
  const el = await resolveInput(page, action.target, action.position)
  await el.fill(action.value)
  if (action.pressAfter) {
    await page.keyboard.press(action.pressAfter)
  }
}

async function executeClear(page: Page, target: string): Promise<void> {
  const el = await resolveInput(page, target)
  await el.clear()
}

async function executeSelect(page: Page, action: Extract<Action, { type: 'select' }>): Promise<void> {
  const el = await resolveSelect(page, action.target)
  const tag = await el.evaluate(e => (e as HTMLElement).tagName.toLowerCase())

  if (tag === 'select') {
    // Native <select>
    if (action.option === '__first__') {
      const options = await el.locator('option').all()
      if (options.length > 1) {
        const val = await options[1].getAttribute('value')
        if (val) await el.selectOption(val)
      }
    } else {
      await el.selectOption({ label: action.option })
    }
  } else {
    // Custom combobox / dropdown
    // Use CSS attribute selector [role="option"] (not getByRole) so we only match
    // custom option elements and avoid native <option> elements inside <select> tags,
    // which getByRole('option') also returns and which are always hidden.
    await el.click()
    await page.waitForTimeout(300)
    if (action.option === '__first__') {
      const option = page.locator('[role="option"]').first()
      await option.waitFor({ state: 'visible', timeout: 3000 })
      await option.click()
    } else {
      const option = page.locator('[role="option"]').filter({ hasText: action.option }).first()
      await option.waitFor({ state: 'visible', timeout: 3000 })
      await option.click()
    }
  }
}

async function executeCheck(page: Page, action: Extract<Action, { type: 'check' }>): Promise<void> {
  if (action.position === 'first') {
    // Find first unchecked checkbox in the list context
    const checkboxes = page.getByRole('checkbox')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i)
      const checked = await cb.isChecked()
      if (!checked) {
        await cb.check()
        return
      }
    }
  } else {
    const el = await resolveElement(page, action.target, { kind: 'checkbox' })
    await el.check()
  }
}

async function executeUncheck(page: Page, target: string): Promise<void> {
  const el = await resolveElement(page, target, { kind: 'checkbox' })
  await el.uncheck()
}

async function executeWait(page: Page, action: Extract<Action, { type: 'wait' }>): Promise<void> {
  if (action.condition === 'page_load') {
    await page.waitForLoadState('networkidle')
    return
  }
  if (!action.target) return

  const el = page.getByText(action.target).or(page.getByLabel(action.target))
  if (action.condition === 'appear') {
    await el.waitFor({ state: 'visible', timeout: 10000 })
  } else {
    await el.waitFor({ state: 'hidden', timeout: 10000 })
  }
}

async function executeUpload(page: Page, action: Extract<Action, { type: 'upload' }>): Promise<void> {
  if (action.target) {
    const el = await resolveElement(page, action.target)
    await el.setInputFiles(action.file)
  } else {
    // Unlabelled upload zone — find first file input
    const input = page.locator('input[type="file"]').first()
    await input.setInputFiles(action.file)
  }
}

async function executeConfirmDialog(page: Page): Promise<void> {
  // Handle native browser dialogs
  page.once('dialog', d => d.accept())

  // Also try clicking confirm buttons in custom modal dialogs
  const confirmButtons = ['Yes', 'Confirm', 'OK', 'Proceed', 'Accept']
  for (const label of confirmButtons) {
    const btn = page.getByRole('button', { name: label })
    if (await btn.count() > 0) {
      await btn.first().click()
      return
    }
  }
}

async function executeDismissDialog(page: Page): Promise<void> {
  page.once('dialog', d => d.dismiss())
  const cancelButtons = ['Cancel', 'No', 'Dismiss', 'Close']
  for (const label of cancelButtons) {
    const btn = page.getByRole('button', { name: label })
    if (await btn.count() > 0) {
      await btn.first().click()
      return
    }
  }
}

async function executeScroll(page: Page, target: string): Promise<void> {
  const el = await resolveElement(page, target)
  await el.scrollIntoViewIfNeeded()
}

async function executeHover(page: Page, target: string): Promise<void> {
  const el = await resolveElement(page, target)
  await el.hover()
}

async function executeOpenActionMenu(
  page: Page,
  action: Extract<Action, { type: 'open_action_menu' }>,
): Promise<void> {
  if (action.scope === 'first_row' && action.table) {
    // Find the first row in the given table and click its action/kebab menu button
    const row = page.getByRole('row').nth(1) // nth(0) is header
    const menuBtn = row.getByRole('button').last() // kebab is usually last
    await menuBtn.click()
  } else if (action.context) {
    const row = page.locator('tr, [role="row"]').filter({ hasText: action.context }).first()
    const menuBtn = row.getByRole('button').last()
    await menuBtn.click()
  }
}

async function executeSetupSelect(
  page: Page,
  action: Extract<Action, { type: 'setup_select' }>,
): Promise<void> {
  // This handles SETUP precondition selectors like:
  // "select first budget with status "PENDING" from left panel"
  if (action.status) {
    // Find the first item in a list/table matching the given status
    const statusEl = page.getByText(action.status, { exact: true }).first()
    if (await statusEl.count() > 0) {
      // Click the row/card containing this status
      const row = page.locator('tr, [role="row"], [data-card]').filter({ has: statusEl }).first()
      if (await row.count() > 0) {
        await row.click()
        return
      }
      await statusEl.click()
    }
  } else {
    // Just click the first available item
    const firstItem = page.getByRole('row').nth(1)
    if (await firstItem.count() > 0) {
      await firstItem.click()
    }
  }
}
