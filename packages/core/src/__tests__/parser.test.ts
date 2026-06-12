import { describe, it, expect } from 'vitest'
import { parseContent, parseActionLine, parseAssertionLine, ParseError } from '../parser/index.js'

// ─── parseContent ─────────────────────────────────────────────────────────────

describe('parseContent — file header', () => {
  it('parses AUTH and MODULE', () => {
    const ctx = parseContent('AUTH standard-login\nMODULE budgeting\n')
    expect(ctx.auth).toBe('standard-login')
    expect(ctx.module).toBe('budgeting')
  })

  it('defaults to undefined when header fields are absent', () => {
    const ctx = parseContent('TEST T-01: do something\nSTEPS\n  click "New"\nASSERT\n  modal is open\n')
    expect(ctx.auth).toBeUndefined()
    expect(ctx.module).toBeUndefined()
  })
})

describe('parseContent — test block', () => {
  const spec = `
AUTH standard-login

---

TEST P-01: Create a budget

STEPS
  click "New"
  select first from "Fiscal Cycle"
  click "Save"

ASSERT
  toast shows "Budget created successfully"
`.trim()

  it('parses test id and description', () => {
    const ctx = parseContent(spec)
    expect(ctx.tests).toHaveLength(1)
    expect(ctx.tests[0].id).toBe('P-01')
    expect(ctx.tests[0].description).toBe('Create a budget')
  })

  it('parses steps', () => {
    const ctx = parseContent(spec)
    const steps = ctx.tests[0].stepGroups[0].steps
    expect(steps).toHaveLength(3)
    expect(steps[0]).toMatchObject({ type: 'click', target: 'New' })
    expect(steps[1]).toMatchObject({ type: 'select', option: '__first__', target: 'Fiscal Cycle' })
    expect(steps[2]).toMatchObject({ type: 'click', target: 'Save' })
  })

  it('parses assertions', () => {
    const ctx = parseContent(spec)
    const assertions = ctx.tests[0].stepGroups[0].assertions
    expect(assertions).toHaveLength(1)
    expect(assertions[0]).toMatchObject({ type: 'toast_shows', expected: 'Budget created successfully' })
  })
})

describe('parseContent — SETUP block', () => {
  const spec = `
---

TEST P-12: Add fees

SETUP
  select first budget with status "PENDING" from left panel

STEPS
  click tab "Budgeted Fees"

ASSERT
  modal is open
`.trim()

  it('parses SETUP actions separately', () => {
    const ctx = parseContent(spec)
    const test = ctx.tests[0]
    expect(test.setup).toHaveLength(1)
    expect(test.setup[0]).toMatchObject({ type: 'setup_select', entityType: 'budget', status: 'PENDING' })
  })

  it('does not include SETUP lines in stepGroups', () => {
    const ctx = parseContent(spec)
    const steps = ctx.tests[0].stepGroups[0].steps
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'click_tab', target: 'Budgeted Fees' })
  })
})

describe('parseContent — per-test AUTH override', () => {
  it('picks up AUTH override on a test', () => {
    const spec = `AUTH standard-login\n\n---\n\nTEST N-11: No New button\nAUTH restricted-user\n\nASSERT\n  "New" is not visible\n`
    const ctx = parseContent(spec)
    expect(ctx.auth).toBe('standard-login')
    expect(ctx.tests[0].auth).toBe('restricted-user')
  })
})

describe('parseContent — DEPENDS ON', () => {
  it('parses a single dependency', () => {
    const spec = `---\nTEST T-02: second\nDEPENDS ON T-01\n\nSTEPS\n  click "Go"\n\nASSERT\n  modal is open\n`
    const ctx = parseContent(spec)
    expect(ctx.tests[0].dependsOn).toEqual(['T-01'])
  })

  it('parses multiple dependencies', () => {
    const spec = `---\nTEST T-03: third\nDEPENDS ON T-01, T-02\n\nSTEPS\n  click "Go"\n\nASSERT\n  modal is open\n`
    const ctx = parseContent(spec)
    expect(ctx.tests[0].dependsOn).toEqual(['T-01', 'T-02'])
  })
})

describe('parseContent — inline comments', () => {
  it('strips inline # comments outside quotes', () => {
    const spec = `---\nTEST T-01: thing # comment\n\nSTEPS\n  click "Save" # save it\n\nASSERT\n  modal is open\n`
    const ctx = parseContent(spec)
    expect(ctx.tests[0].description).toBe('thing')
  })

  it('preserves # inside quoted strings', () => {
    const spec = `---\nTEST T-01: thing\n\nSTEPS\n  click "hash#tag"\n\nASSERT\n  modal is open\n`
    const ctx = parseContent(spec)
    expect(ctx.tests[0].stepGroups[0].steps[0]).toMatchObject({ type: 'click', target: 'hash#tag' })
  })
})

describe('parseContent — multiple tests and separators', () => {
  const spec = `
AUTH login

---

TEST A-01: first
STEPS
  click "One"
ASSERT
  modal is open

---

TEST A-02: second
STEPS
  click "Two"
ASSERT
  modal is closed
`.trim()

  it('parses two tests', () => {
    const ctx = parseContent(spec)
    expect(ctx.tests).toHaveLength(2)
    expect(ctx.tests[0].id).toBe('A-01')
    expect(ctx.tests[1].id).toBe('A-02')
  })
})

// ─── parseActionLine ──────────────────────────────────────────────────────────

describe('parseActionLine — navigation', () => {
  it('navigate to', () => expect(parseActionLine('navigate to "/dashboard"')).toMatchObject({ type: 'navigate', path: '/dashboard' }))
  it('go back',    () => expect(parseActionLine('go back')).toMatchObject({ type: 'go_back' }))
  it('refresh',    () => expect(parseActionLine('refresh page')).toMatchObject({ type: 'refresh' }))
})

describe('parseActionLine — click variants', () => {
  it('plain click',             () => expect(parseActionLine('click "Save"')).toMatchObject({ type: 'click', target: 'Save' }))
  it('click tab',               () => expect(parseActionLine('click tab "Core"')).toMatchObject({ type: 'click_tab', target: 'Core' }))
  it('double click',            () => expect(parseActionLine('double click "Row"')).toMatchObject({ type: 'double_click', target: 'Row' }))
  it('click in sidebar',        () => expect(parseActionLine('click "Menu" in sidebar')).toMatchObject({ type: 'click', target: 'Menu', scope: 'sidebar' }))
  it('click in action bar',     () => expect(parseActionLine('click "Review" in action bar')).toMatchObject({ type: 'click', target: 'Review', scope: 'actionBar' }))
  it('click in modal',          () => expect(parseActionLine('click "OK" in modal')).toMatchObject({ type: 'click', target: 'OK', scope: 'modal' }))
  it('click in breadcrumb',     () => expect(parseActionLine('click "Home" in breadcrumb')).toMatchObject({ type: 'click', target: 'Home', scope: 'breadcrumb' }))
  it('click in row',            () => expect(parseActionLine('click "Edit" in row "Alpha"')).toMatchObject({ type: 'click', target: 'Edit', scope: 'row', context: 'Alpha' }))
})

describe('parseActionLine — type', () => {
  it('type into',               () => expect(parseActionLine('type "hello" into "Name"')).toMatchObject({ type: 'type', value: 'hello', target: 'Name' }))
  it('type into first',         () => expect(parseActionLine('type "100" into first "Amount"')).toMatchObject({ type: 'type', value: '100', target: 'Amount', position: 'first' }))
  it('type and press',          () => expect(parseActionLine('type "q" into "Search" and press Enter')).toMatchObject({ type: 'type', value: 'q', target: 'Search', pressAfter: 'Enter' }))
  it('clear',                   () => expect(parseActionLine('clear "Description"')).toMatchObject({ type: 'clear', target: 'Description' }))
})

describe('parseActionLine — select', () => {
  it('select first from',       () => expect(parseActionLine('select first from "Fiscal Cycle"')).toMatchObject({ type: 'select', option: '__first__', target: 'Fiscal Cycle' }))
  it('select named from',       () => expect(parseActionLine('select "Active" from "Status"')).toMatchObject({ type: 'select', option: 'Active', target: 'Status' }))
})

describe('parseActionLine — check / uncheck', () => {
  it('check label',             () => expect(parseActionLine('check "Include All"')).toMatchObject({ type: 'check', target: 'Include All' }))
  it('check first in',          () => expect(parseActionLine('check first in "Programme"')).toMatchObject({ type: 'check', target: 'Programme', position: 'first' }))
  it('uncheck',                 () => expect(parseActionLine('uncheck "Include All"')).toMatchObject({ type: 'uncheck', target: 'Include All' }))
})

describe('parseActionLine — wait', () => {
  it('wait page load',          () => expect(parseActionLine('wait for page to load')).toMatchObject({ type: 'wait', condition: 'page_load' }))
  it('wait appear',             () => expect(parseActionLine('wait for "Spinner" to appear')).toMatchObject({ type: 'wait', target: 'Spinner', condition: 'appear' }))
  it('wait disappear',          () => expect(parseActionLine('wait for "Spinner" to disappear')).toMatchObject({ type: 'wait', target: 'Spinner', condition: 'disappear' }))
})

describe('parseActionLine — misc', () => {
  it('upload to target',        () => expect(parseActionLine('upload "file.pdf" to "Attachment"')).toMatchObject({ type: 'upload', file: 'file.pdf', target: 'Attachment' }))
  it('upload to upload zone',   () => expect(parseActionLine('upload "file.pdf" to upload zone')).toMatchObject({ type: 'upload', file: 'file.pdf', target: null }))
  it('press key',               () => expect(parseActionLine('press "Escape"')).toMatchObject({ type: 'press', key: 'Escape' }))
  it('confirm dialog',          () => expect(parseActionLine('confirm dialog')).toMatchObject({ type: 'confirm_dialog' }))
  it('dismiss dialog',          () => expect(parseActionLine('dismiss dialog')).toMatchObject({ type: 'dismiss_dialog' }))
  it('scroll to',               () => expect(parseActionLine('scroll to "Footer"')).toMatchObject({ type: 'scroll', target: 'Footer' }))
  it('hover over',              () => expect(parseActionLine('hover over "Tooltip"')).toMatchObject({ type: 'hover', target: 'Tooltip' }))
  it('open action menu first row', () => expect(parseActionLine('open action menu in first row of "Fees"')).toMatchObject({ type: 'open_action_menu', scope: 'first_row', table: 'Fees' }))
  it('open action menu for',    () => expect(parseActionLine('open action menu for "Budget Alpha"')).toMatchObject({ type: 'open_action_menu', context: 'Budget Alpha' }))
})

describe('parseActionLine — setup selectors', () => {
  it('select first with status', () => expect(parseActionLine('select first budget with status "PENDING" from left panel')).toMatchObject({ type: 'setup_select', entityType: 'budget', status: 'PENDING', from: 'left panel' }))
  it('select any',               () => expect(parseActionLine('select any budget from left panel')).toMatchObject({ type: 'setup_select', entityType: 'budget', from: 'left panel' }))
})

describe('parseActionLine — unknown action throws', () => {
  it('throws ParseError on unknown input', () => {
    expect(() => parseActionLine('fly to the moon')).toThrow(ParseError)
  })
})

// ─── parseAssertionLine ───────────────────────────────────────────────────────

describe('parseAssertionLine — visibility', () => {
  it('is visible',                   () => expect(parseAssertionLine('"Submit" is visible')).toMatchObject({ type: 'is_visible', target: 'Submit' }))
  it('is not visible',               () => expect(parseAssertionLine('"Submit" is not visible')).toMatchObject({ type: 'is_not_visible', target: 'Submit' }))
  it('is visible in action bar',     () => expect(parseAssertionLine('"Approve" is visible in action bar')).toMatchObject({ type: 'is_visible', target: 'Approve', scope: 'actionBar' }))
  it('is not visible in action bar', () => expect(parseAssertionLine('"Finalize" is not visible in action bar')).toMatchObject({ type: 'is_not_visible', target: 'Finalize', scope: 'actionBar' }))
  it('is visible in sidebar',        () => expect(parseAssertionLine('"Dashboard" is visible in sidebar')).toMatchObject({ type: 'is_visible', target: 'Dashboard', scope: 'sidebar' }))
  it('is visible in breadcrumb',     () => expect(parseAssertionLine('"Home" is visible in breadcrumb')).toMatchObject({ type: 'is_visible', target: 'Home', scope: 'breadcrumb' }))
})

describe('parseAssertionLine — tab assertions', () => {
  it('tab is visible',    () => expect(parseAssertionLine('"Core" tab is visible')).toMatchObject({ type: 'is_visible', target: 'Core', kind: 'tab' }))
  it('tab is not visible',() => expect(parseAssertionLine('"Fees" tab is not visible')).toMatchObject({ type: 'is_not_visible', target: 'Fees', kind: 'tab' }))
  it('tab is active',     () => expect(parseAssertionLine('"Core" tab is active')).toMatchObject({ type: 'is_active', target: 'Core', kind: 'tab' }))
})

describe('parseAssertionLine — state', () => {
  it('is enabled',   () => expect(parseAssertionLine('"Fiscal Cycle" is enabled')).toMatchObject({ type: 'is_enabled', target: 'Fiscal Cycle' }))
  it('is disabled',  () => expect(parseAssertionLine('"Fiscal Cycle" is disabled')).toMatchObject({ type: 'is_disabled', target: 'Fiscal Cycle' }))
  it('is checked',   () => expect(parseAssertionLine('"Select All" is checked')).toMatchObject({ type: 'is_checked', target: 'Select All' }))
})

describe('parseAssertionLine — modal', () => {
  it('modal is open',       () => expect(parseAssertionLine('modal is open')).toMatchObject({ type: 'modal_is_open' }))
  it('modal is closed',     () => expect(parseAssertionLine('modal is closed')).toMatchObject({ type: 'modal_is_closed' }))
  it('modal stays open',    () => expect(parseAssertionLine('modal stays open')).toMatchObject({ type: 'modal_stays_open' }))
})

describe('parseAssertionLine — content', () => {
  it('equals',              () => expect(parseAssertionLine('"Status" equals "PENDING"')).toMatchObject({ type: 'equals', target: 'Status', expected: 'PENDING' }))
  it('not equals',          () => expect(parseAssertionLine('"Status" does not equal "DRAFT"')).toMatchObject({ type: 'not_equals', target: 'Status', expected: 'DRAFT' }))
  it('contains',            () => expect(parseAssertionLine('"Description" contains "Annual"')).toMatchObject({ type: 'contains', target: 'Description', expected: 'Annual' }))
  it('not contains',        () => expect(parseAssertionLine('"Description" does not contain "Draft"')).toMatchObject({ type: 'not_contains', target: 'Description', expected: 'Draft' }))
  it('unquoted target equals', () => expect(parseAssertionLine('status badge equals "REVIEWED"')).toMatchObject({ type: 'equals', target: 'status badge', expected: 'REVIEWED' }))
  it('unquoted target contains', () => expect(parseAssertionLine('left panel contains "PENDING"')).toMatchObject({ type: 'contains', target: 'left panel', expected: 'PENDING' }))
  it('scoped equals',       () => expect(parseAssertionLine('"Amount" in "Row 1" equals "500"')).toMatchObject({ type: 'equals', target: 'Amount', scope: 'Row 1', expected: '500' }))
  it('scoped shows',        () => expect(parseAssertionLine('"Balance" in sidebar shows "1000"')).toMatchObject({ type: 'shows', target: 'Balance', scope: 'sidebar', expected: '1000' }))
})

describe('parseAssertionLine — toast', () => {
  it('toast shows',    () => expect(parseAssertionLine('toast shows "Budget created successfully"')).toMatchObject({ type: 'toast_shows', expected: 'Budget created successfully' }))
  it('toast contains', () => expect(parseAssertionLine('toast contains "successfully"')).toMatchObject({ type: 'toast_contains', expected: 'successfully' }))
})

describe('parseAssertionLine — errors', () => {
  it('form error', () => expect(parseAssertionLine('form error shows "Field is required"')).toMatchObject({ type: 'form_error', expected: 'Field is required' }))
  it('error shows',() => expect(parseAssertionLine('error shows "Something went wrong"')).toMatchObject({ type: 'error_shows', expected: 'Something went wrong' }))
})

describe('parseAssertionLine — count', () => {
  it('count is',         () => expect(parseAssertionLine('count of "Row" is 3')).toMatchObject({ type: 'count_is', target: 'Row', count: 3 }))
  it('count decreases',  () => expect(parseAssertionLine('"Fees" row count decreases by 1')).toMatchObject({ type: 'count_decreases', target: 'Fees', by: 1 }))
})

describe('parseAssertionLine — URL', () => {
  it('url is',         () => expect(parseAssertionLine('url is "/dashboard"')).toMatchObject({ type: 'url_is', expected: '/dashboard' }))
  it('url contains',   () => expect(parseAssertionLine('url contains "budget"')).toMatchObject({ type: 'url_contains', expected: 'budget' }))
  it('redirects to',   () => expect(parseAssertionLine('page redirects to "/login"')).toMatchObject({ type: 'redirects_to', expected: '/login' }))
})

describe('parseAssertionLine — unknown assertion throws', () => {
  it('throws ParseError on unknown input', () => {
    expect(() => parseAssertionLine('sky is blue')).toThrow(ParseError)
  })
})
