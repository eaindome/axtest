// Run with the frontend, API, and fixture app running. Only the uniquely named verification project is removed.
const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const { chromium } = createRequire(
  process.cwd() + '/packages/core/package.json',
)('playwright')
const API = process.env.AXTEST_TEST_API ?? 'http://localhost:5000'
const WEB = process.env.AXTEST_TEST_WEB ?? 'http://localhost:5173'
const { register } = require('./browser_auth.cjs')
let context
async function http(method, path, body) {
  const session = await (await context.request.get(API + '/api/auth/session')).json()
  const response = await context.request.fetch(API + path, {
    method,
    headers: { 'X-CSRF-TOKEN':session.csrfToken },
    data: body,
  })
  if (!response.ok())
    throw new Error(
      `${method} ${path}: ${response.status()} ${await response.text()}`,
    )
  return response.status() === 204 ? null : response.json()
}
;(async () => {
  const browser = await chromium.launch({ headless: true })
  let projectId, workspaceId
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    })
    page.setDefaultTimeout(30000)
    context = page.context()
    await register(context, API)
    const errors = [],
      calls = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => {
      if (r.url().startsWith(API)) calls.push(r.url())
    })
    await page.addInitScript(() => {
      if (localStorage.getItem('axtest_mock') === null)
        localStorage.setItem('axtest_mock', 'false')
    })
    await page.goto(WEB)
    await page
      .getByRole('heading', { name: 'A clearer view of quality.' })
      .waitFor()
    assert(!page.url().includes('login'))
    assert(
      await page.evaluate(() => !localStorage.getItem('api:axtest_token')),
    )
    console.log(
      'PASS API mode restores a real cookie session without a localStorage token',
    )
    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'New project', exact: true }).click()
    const name = 'UI integration ' + Date.now()
    await page.getByLabel('Project name').fill(name)
    await page.getByLabel('Production URL').fill('http://localhost:4321')
    const created = page.waitForResponse(
      (r) =>
        r.url().includes('/projects') &&
        r.request().method() === 'POST' &&
        r.status() === 201,
    )
    await page
      .getByRole('button', { name: 'Create Project', exact: true })
      .click()
    const project = await (await created).json()
    projectId = project.id
    workspaceId = (await http('GET', '/api/workspaces'))[0].id
    const auth = await http('POST', `/api/projects/${projectId}/files`, {
      name: 'standard-login',
      folder: 'auth',
    })
    await http('PUT', `/api/projects/${projectId}/files/${auth.id}`, {
      content:
        'AUTH standard-login\nSTEPS\n navigate to /#/login\n type "admin@test.com" in "Email address"\n type "test123" in "Password"\n click "Sign In"\nASSERT\n assert url contains "#/budgets"',
    })
    await page
      .getByRole('link', { name, exact: true })
      .click()
    await page.getByRole('link', { name: 'Create your first test', exact: true }).click()
    try {
      await page.getByRole('button', { name: 'modules', exact: true }).hover()
    } catch (error) {
      console.log(
        'EDITOR DEBUG',
        page.url(),
        errors,
        await page.locator('body').innerText(),
      )
      throw error
    }
    await page.getByTitle('New file in modules', { exact: true }).click()
    await page.getByPlaceholder('name.axtest').fill('integration.axtest')
    await page.getByPlaceholder('name.axtest').press('Enter')
    await page.waitForFunction(() =>
      document
        .querySelector('.cm-content')
        ?.textContent.includes('title: integration'),
    )
    const content =
      '---\ntitle: Integrated browser run\n---\nAUTH standard-login\nTEST "UI integration pass"\n ID ui-pass\n STEPS\n  navigate to /#/budgets\n ASSERT\n  assert "FY 2024 Budget" is_visible\nTEST "UI integration failure"\n ID ui-fail\n ASSERT\n  assert "Intentionally missing element" is_visible'
    await page.locator('.cm-content').click()
    await page.keyboard.press('Control+KeyA')
    await page.keyboard.insertText(content)
    const saved = page.waitForResponse(
      (r) =>
        r.url().includes('/files/') && r.request().method() === 'PUT' && r.ok(),
    )
    await page.waitForFunction(() =>
      document
        .querySelector('.cm-content')
        ?.textContent.includes('UI integration failure'),
    )
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await saved
    const explorer = await http('GET', `/api/projects/${projectId}/explorer`)
    const file = explorer.files.find(
      (f) => f.path === 'modules/integration.axtest',
    )
    assert.equal(file.content, content)
    console.log(
      'PASS create project, create file and save editor content to PostgreSQL',
    )
    await page.reload()
    await page
      .getByRole('button', { name: 'integration.axtest', exact: true })
      .click()
    await page.waitForFunction(() =>
      document
        .querySelector('.cm-content')
        ?.textContent.includes('UI integration pass'),
    )
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await page
      .getByRole('button', { name: 'Use production URL', exact: true })
      .click()
    await page.getByRole('button', { name: 'Start run', exact: true }).click()
    await page
      .getByText('1/2 passed', { exact: true })
      .first()
      .waitFor({ timeout: 150000 })
    assert(calls.some((url) => url.includes('/runs/file?wait=false')))
    assert(calls.some((url) => /\/runs\/\d+$/.test(url)))
    await page
      .getByRole('button', { name: 'View screenshot', exact: true })
      .click()
    await page
      .getByAltText('Screenshot captured when this test failed')
      .waitFor()
    assert(
      await page
        .getByAltText('Screenshot captured when this test failed')
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    console.log(
      'PASS queued real run, application login, polling, results and screenshot preview',
    )
    await page.goto(`${WEB}/projects/${projectId}/history`)
    await page
      .getByRole('button')
      .filter({ hasText: 'modules/integration.axtest' })
      .click()
    await page
      .getByRole('button', { name: 'View screenshot', exact: true })
      .click()
    await page
      .getByAltText('Screenshot captured when this test failed')
      .waitFor()
    console.log('PASS persisted run history and failure evidence')
    await page.getByRole('switch', { name: 'Toggle mock API' }).click()
    await page.waitForURL('**/login')
    const mark = calls.length
    await page.getByLabel('Username').fill('mock-user')
    await page.getByLabel('Password').fill('anything')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page
      .getByRole('heading', { name: 'A clearer view of quality.' })
      .waitFor()
    assert.equal(calls.length, mark)
    assert.equal(await page.getByText(name, { exact: true }).count(), 0)
    assert(
      await page.evaluate(() => !!localStorage.getItem('mock:axtest_token')),
    )
    await page.getByRole('switch', { name: 'Toggle mock API' }).click()
    await page
      .getByRole('heading', { name: 'A clearer view of quality.' })
      .waitFor()
    assert(await page.getByText('Browser verification', { exact: true }).count())
    console.log(
      'PASS mock mode remains independent, then API session and real data restore',
    )
    await page.route(API + '/api/auth/session', (route) => route.abort())
    await page.reload()
    await page.getByRole('heading', { name: 'Workspace unavailable' }).waitFor()
    await page.getByRole('button', { name: 'Try again', exact: true }).waitFor()
    await page.unroute(API + '/api/auth/session')
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await page
      .getByRole('heading', { name: 'A clearer view of quality.' })
      .waitFor()
    assert.deepEqual(errors, [])
    console.log(
      'PASS API outage is visible and retry recovers; no runtime errors',
    )
  } finally {
    if (projectId) {
      await http('POST', `/api/workspaces/${workspaceId}/projects/${projectId}/archive`)
      await http(
        'DELETE',
        `/api/workspaces/${workspaceId}/projects/${projectId}`,
      )
    }
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
