const assert = require('node:assert/strict')
const http = require('node:http')
const { createRequire } = require('node:module')
const { chromium, request } = createRequire(process.cwd() + '/packages/core/package.json')('playwright')
const { register } = require('./browser_auth.cjs')
const API = 'http://localhost:5000', WEB = 'http://localhost:5173'

;(async () => {
  const fixture = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html')
    res.end('<!doctype html><html><body><h1>Task list</h1><label>New task<input id="task"></label><button onclick="document.querySelector(\'ul\').textContent=document.querySelector(\'input\').value">Add task</button><ul></ul></body></html>')
  })
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve))
  const target = `http://127.0.0.1:${fixture.address().port}`
  const browser = await chromium.launch()
  let client, project, workspace, page
  async function call(method, path, data, expected = 200) {
    const session = await (await client.get(API + '/api/auth/session')).json()
    const response = await client.fetch(API + path, { method, data, headers: { 'X-CSRF-TOKEN': session.csrfToken }, timeout: 180000 })
    assert.equal(response.status(), expected, `${method} ${path}`)
    return response.status() === 204 ? null : response.json()
  }
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    client = page.request
    await register(page.context(), API)
    workspace = (await call('GET', '/api/workspaces'))[0].id
    project = await call('POST', `/api/workspaces/${workspace}/projects`, { name: 'Authoring verification ' + Date.now(), baseUrl: target }, 201)
    await page.goto(`${WEB}/projects/${project.id}/suites?mode=api`)
    await page.getByRole('button', { name: 'Create your first suite', exact: true }).click()
    await page.getByLabel('Suite name', { exact: true }).fill('Task journeys')
    assert.equal((await call('GET', `/api/projects/${project.id}/explorer`)).files.length, 0, 'Opening a draft must not create an empty saved suite.')
    const content = '---\ntitle: Task journeys\n---\n# axtest:suite\nTEST "Open task list"\n ID open-tasks\nSTEPS\n navigate to "/"\nASSERT\n assert "Task list" is_visible\nTEST "Create a task"\n ID create-task\n DEPENDS ON "open-tasks"\nSTEPS\n navigate to "/"\n type "{{AXTEST_USERNAME}}" in "New task"\n click "Add task"\nASSERT\n assert "{{AXTEST_USERNAME}}" is_visible\n'
    async function code(content) {
      await page.getByRole('tab', { name: 'Code', exact: true }).click()
      await page.locator('.cm-content').fill(content)
    }
    async function save() {
      const notifications = page.locator('[aria-label="Notifications"]')
      for (const button of await notifications.getByRole('button', { name: 'Dismiss notification' }).all()) await button.click()
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await notifications.getByText('Suite saved.', { exact: true }).waitFor()
    }
    await code(content)
    await save()
    let file = (await call('GET', `/api/projects/${project.id}/explorer`)).files[0]
    assert.equal(file.content, content)
    const account = await call('POST', `/api/projects/${project.id}/test-accounts`, { name: 'Saved todo account', environment: 'production', variables: { AXTEST_USERNAME: 'task-' + Date.now(), AXTEST_PASSWORD: require('node:crypto').randomBytes(24).toString('base64url') } })
    const advanced = '\n# advanced source retained verbatim\nTEST "Advanced control"\n  ID advanced-control\nSTEPS\n navigate to "/"\nASSERT\n assert "Task list" is_visible\nSTEPS\n wait for "Task list" to appear\nASSERT\n assert "Task list" is_visible\n'
    file = await call('PUT', `/api/projects/${project.id}/files/${file.id}`, { content: content + advanced, expectedUpdatedAt: file.updatedAt })
    await call('PUT', `/api/projects/${project.id}/files/${file.id}`, { content: 'must not replace newer source', expectedUpdatedAt: '2000-01-01T00:00:00Z' }, 409)
    await page.getByRole('link', { name: 'Back to suites', exact: true }).click()
    await page.getByRole('button', { name: 'Open suite Task journeys', exact: true }).click()
    await page.getByLabel('Create a task', { exact: true }).check()
    await page.getByRole('button', { name: 'Test account', exact: true }).click()
    await page.getByRole('option', { name: 'Saved todo account', exact: true }).click()
    await page.getByRole('button', { name: 'Edit test Create a task', exact: true }).click()
    await page.getByText('This suite uses advanced syntax. Code preserves its grouped steps and assertions.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('tab', { name: 'Code', exact: true }).getAttribute('aria-selected'), 'true')
    assert.match(await page.getByRole('button', { name: 'Test account', exact: true }).innerText(), /Saved todo account/)
    // Simulate another editor saving while this one has an older revision.
    const newer = await call('PUT', `/api/projects/${project.id}/files/${file.id}`, { content: file.content + '\n# another edit\n', expectedUpdatedAt: file.updatedAt })
    await code(file.content + '\n# my local draft\n')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.locator('[aria-label="Notifications"]').getByRole('alert').filter({ hasText: 'changed since you opened' }).waitFor()
    assert.match(await page.locator('.cm-content').innerText(), /my local draft/)
    assert.equal((await call('GET', `/api/projects/${project.id}/explorer`)).files[0].content, newer.content)
    page.once('dialog', dialog => dialog.accept())
    await page.reload()
    await page.getByRole('region', { name: 'Suite editor context' }).waitFor()
    assert((await page.locator('.cm-content').innerText()).includes('# another edit'))
    // A real edit keeps the advanced tail byte-for-byte.
    await code(newer.content.replace('title: Task journeys', 'title: Task journeys revised'))
    await save()
    file = (await call('GET', `/api/projects/${project.id}/explorer`)).files[0]
    assert(file.content.endsWith(advanced + '\n# another edit\n'))
    const submitted = page.waitForResponse(response => response.url().endsWith('/runs/batch') && response.request().method() === 'POST')
    await page.getByRole('tab', { name: 'Visual', exact: true }).click()
    await page.locator('[aria-label="Notifications"]').getByRole('alert').filter({ hasText: 'advanced syntax' }).waitFor()
    assert.equal(await page.getByRole('dialog', { name: 'Run options' }).count(), 0)
    // Check the editor's real run request, then release its browser while the worker executes.
    await page.getByRole('button', { name: 'Run this suite', exact: true }).click()
    const response = await submitted
    assert.equal(response.status(), 202)
    assert.equal(response.request().postDataJSON().accountId, account.id)
    const submittedRuns = await response.json()
    // Release the UI browser before starting the worker on memory-constrained machines.
    client = await request.newContext({ storageState: await page.context().storageState() })
    await browser.close()
    const runs = submittedRuns
    let run, deadline = Date.now() + 120000
    do {
      run = await call('GET', `/api/projects/${project.id}/runs/${runs[0].id}`)
      if (['passed', 'failed'].includes(run.status)) break
      await new Promise(resolve => setTimeout(resolve, 500))
    } while (Date.now() < deadline)
    assert.equal(run.status, 'passed', JSON.stringify(run))
    assert.equal(run.totalTests, 3)
    assert.equal(run.passedTests, 3)
    console.log('PASS full-editor drafts, saved-account handoff, conflict toasts without losing drafts, advanced source preservation and actual editor execution (3/3 passed)')
  } finally {
    try { if (project && client) {
      await call('POST', `/api/workspaces/${workspace}/projects/${project.id}/archive`, undefined, 204)
      await call('DELETE', `/api/workspaces/${workspace}/projects/${project.id}`, undefined, 204)
    }
    } finally {
    await browser.close()
    if (client) await client.dispose()
    await new Promise(resolve => fixture.close(resolve))
    }
  }
})().catch(error => { console.error(String(error)); process.exitCode = 1 })
