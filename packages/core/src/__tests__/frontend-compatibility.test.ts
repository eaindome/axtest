import { describe, it, expect } from 'vitest'
import {
  parseContent,
  parseActionLine,
  parseAssertionLine,
} from '../parser/index.js'
import { executeAssertion } from '../executor/assertions.js'
import type { Page } from 'playwright'
import { parseAxtest, serializeAxtest } from '../authoring/parse-axtest'

describe('visual reusable flows', () => {
  it('preserves an AUTH flow and its waits when edited visually', () => {
    const source = 'AUTH self-login\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\n type "{{AXTEST_USERNAME}}" in "Username"\n type "{{AXTEST_PASSWORD}}" in "Password"\n click "Sign in"\n wait for "Dashboard" to appear\nASSERT\n assert url contains "/dashboard"'
    const visual = parseAxtest(source)
    expect(visual.flow).toBe('auth')
    expect(visual.tests).toHaveLength(1)
    expect(visual.tests[0].steps).toHaveLength(6)
    expect(visual.tests[0].asserts).toHaveLength(1)
    expect(visual.tests[0].steps[1].type).toBe('wait')
    visual.tests[0].steps[1].target = 'Username field'
    const saved = serializeAxtest(visual)
    expect(saved).not.toMatch(/^TEST /m)
    expect(saved).not.toContain('navigate to wait for')
    expect(saved).toContain('wait for "Username field" to appear')
    const executable = parseContent(saved)
    expect(executable.isFlow).toBe(true)
    expect(executable.auth).toBe('self-login')
    expect(executable.tests[0].stepGroups[0].steps).toHaveLength(6)
  })
  it('preserves MODULE flows and actions without dedicated visual controls', () => {
    const visual = parseAxtest('MODULE open-page\nSTEPS\n press "Enter"\nASSERT\n assert "Saved" is_visible')
    expect(visual.flow).toBe('module')
    expect(visual.tests[0].steps[0].type).toBe('custom')
    const saved = serializeAxtest(visual)
    expect(saved).toContain('MODULE open-page')
    expect(saved).toContain('press "Enter"')
    expect(saved).not.toContain('navigate to press')
    expect(parseContent(saved).isFlow).toBe(true)
  })
  it('keeps an AUTH reference on normal test files as a reference', () => {
    const visual = parseAxtest('AUTH self-login\nTEST "Projects"\n STEPS\n navigate to /projects\n ASSERT\n assert "Projects" is_visible')
    expect(visual.flow).toBeUndefined()
    expect(visual.tests[0].name).toBe('Projects')
    expect(serializeAxtest(visual)).toContain('TEST "Projects"')
  })
})

describe('frontend spec compatibility', () => {
  it('reads field values when required labels include an asterisk', async () => {
    const element = { evaluate: async () => 'input', inputValue: async () => 'target-user' }
    const page = { getByLabel: (label: string | RegExp) => ({ count: async () => label instanceof RegExp && label.test('Username*') ? 1 : 0, first: () => element }) } as unknown as Page
    await expect(executeAssertion(page, { type: 'equals', target: 'Username', expected: 'target-user', raw: 'assertion' })).resolves.toBeUndefined()
  })
  it('parses multiple editor tests without separator lines and preserves stable IDs', () => {
    const source = `---\ntitle: Example\nbase_url: https://example.test\n---\nAUTH login\nRULES\n field "Email" is required\nTEST "Happy path"\n ID stable-1\n TAG seed\n STEPS\n STEP_ID step-1\n type "" in "Email"\n ASSERT\n assert "Email" is_visible\nTEST "Next test"\n ID stable-2\n DEPENDS ON "Happy path"\n ASSERT\n assert url contains "/dashboard"`
    const result = parseContent(source)
    expect(result.baseUrl).toBe('https://example.test')
    expect(result.tests).toHaveLength(2)
    expect(result.tests[0].id).toBe('stable-1')
    expect(result.tests[1].dependsOn).toEqual(['stable-1'])
  })
  it('preserves unquoted hash routes rather than treating them as comments', () => {
    const result = parseContent(
      'AUTH login\\nSTEPS\\n navigate to /#/login\\nASSERT\\n assert "Login" is_visible'.replaceAll(
        '\\n',
        '\n',
      ),
    )
    expect(result.tests[0].stepGroups[0].steps[0]).toMatchObject({
      type: 'navigate',
      path: '/#/login',
    })
  })
  it('loads standalone authentication steps and assertions', () => {
    const result = parseContent(
      'AUTH login\nSTEPS\n navigate to /login\n type "secret" in "Password"\nASSERT\n assert "Dashboard" is_visible',
    )
    expect(result.isFlow).toBe(true)
    expect(result.tests[0].stepGroups[0].steps).toHaveLength(2)
    expect(result.tests[0].stepGroups[0].assertions).toHaveLength(1)
  })
  it('normalizes editor action and assertion forms', () => {
    expect(parseActionLine('type "" in "Email"')).toMatchObject({
      type: 'type',
      value: '',
      target: 'Email',
    })
    expect(parseActionLine('select "First" in "Cycle"')).toMatchObject({
      type: 'select',
      option: 'First',
    })
    expect(parseAssertionLine('assert "Save" is_disabled')).toMatchObject({
      type: 'is_disabled',
      target: 'Save',
    })
  })
  it('rejects duplicate IDs and unknown instructions instead of dropping them', () => {
    expect(() =>
      parseContent(
        'TEST "A"\nID same\nASSERT\nassert "A" is_visible\nTEST "B"\nID same\nASSERT\nassert "B" is_visible',
      ),
    ).toThrow('Duplicate test ID')
    expect(() => parseContent('TEST "A"\nSTEPS\nmagic "A"')).toThrow(
      'Unknown action',
    )
  })
  it('never silently passes an unimplemented count assertion', async () => {
    await expect(
      executeAssertion({} as Page, {
        type: 'count_decreases',
        target: 'Rows',
        by: 1,
        raw: 'count',
      }),
    ).rejects.toThrow('before-state')
  })
  it('does not use unrelated page text when an assertion target is missing', async () => {
    const absent = { count: async () => 0 }
    const page = {
      getByText: () => absent,
      getByRole: () => absent,
      getByLabel: () => absent,
      getByPlaceholder: () => absent,
      getByTitle: () => absent,
      evaluate: async () => 'Expected text elsewhere',
    } as unknown as Page
    await expect(
      executeAssertion(page, {
        type: 'contains',
        target: 'Missing field',
        expected: 'Expected text elsewhere',
        raw: 'assertion',
      }),
    ).rejects.toThrow('Missing field')
  })
  it('distinguishes exact equality from substring containment for form controls', async () => {
    const element = {
      evaluate: async () => 'input',
      inputValue: async () => 'Expected suffix',
    }
    const page = {
      getByLabel: () => ({ count: async () => 1, first: () => element }),
    } as unknown as Page
    await expect(
      executeAssertion(page, {
        type: 'equals',
        target: 'Name',
        expected: 'Expected',
        raw: 'assertion',
      }),
    ).rejects.toThrow('equal')
    await expect(
      executeAssertion(page, {
        type: 'not_equals',
        target: 'Name',
        expected: 'Expected',
        raw: 'assertion',
      }),
    ).resolves.toBeUndefined()
  })
})
