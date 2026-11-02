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
    await page.getByLabel('Suite name', { exact: false }).fill('Task journeys')
    await page.getByRole('button', { name: 'Create suite', exact: true }).click()
    await page.getByRole('dialog', { name: 'New suite', exact: true }).waitFor({ state: 'detached' })
    async function add(name, target, dependency) {
      await page.getByRole('button', { name: 'Add test', exact: true }).click()
      await page.getByLabel('Behaviour name', { exact: false }).fill(name)
      await page.getByLabel('Expected target 1', { exact: false }).fill(target)
      if (dependency) {
        await page.getByRole('button', { name: 'Test prerequisite', exact: true }).click()
        await page.getByRole('option', { name: dependency, exact: true }).click()
      }
      await page.getByRole('button', { name: 'Save test', exact: true }).click()
      await page.getByRole('dialog', { name: 'Add behaviour test', exact: true }).waitFor({ state: 'detached' })
    }
    await add('Open task list', 'Task list')
    await add('Create a task', 'Buy milk', 'Open task list')
    await page.getByRole('button', { name: 'Edit test Create a task', exact: true }).click()
    await page.getByRole('button', { name: 'Add action', exact: true }).click()
    await page.getByRole('button', { name: 'Action 2 type', exact: true }).click()
    await page.getByRole('option', { name: 'Enter text', exact: true }).click()
    await page.getByLabel('Target for action 2', { exact: false }).fill('New task')
    await page.getByLabel('Value for action 2', { exact: false }).fill('Buy milk')
    await page.getByRole('button', { name: 'Add action', exact: true }).click()
    await page.getByLabel('Target for action 3', { exact: false }).fill('Add task')
    await page.getByRole('button', { name: 'Save test', exact: true }).click()
    await page.getByRole('dialog', { name: 'Edit behaviour test', exact: true }).waitFor({ state: 'detached' })
    await page.reload()
    await page.getByRole('button', { name: 'Open suite Task journeys', exact: true }).waitFor()
    let file = (await call('GET', `/api/projects/${project.id}/explorer`)).files[0]
    assert.match(file.content, /type "Buy milk" in "New task"/)
    const original = file.content
    // Preserve unrelated advanced source while editing one simple test.
    const advanced = '\n# advanced source retained verbatim\nTEST "Advanced control"\n  ID advanced-control\nSTEPS\n navigate to "/"\nASSERT\n assert "Task list" is_visible\nSTEPS\n wait for "Task list" to appear\nASSERT\n assert "Task list" is_visible\n'
    file = await call('PUT', `/api/projects/${project.id}/files/${file.id}`, { content: original + advanced, expectedUpdatedAt: file.updatedAt })
    await call('PUT', `/api/projects/${project.id}/files/${file.id}`, { content: 'must not replace newer source', expectedUpdatedAt: '2000-01-01T00:00:00Z' }, 409)
    await page.reload()
    await page.getByRole('button', { name: 'Edit test Open task list', exact: true }).click()
    await page.getByRole('button', { name: 'Save test', exact: true }).click()
    await page.getByRole('dialog', { name: 'Edit behaviour test', exact: true }).waitFor({ state: 'detached' })
    file = (await call('GET', `/api/projects/${project.id}/explorer`)).files[0]
    assert(file.content.endsWith(advanced))
    assert.match(file.content, /type "Buy milk" in "New task"/)
    assert.equal(await page.getByRole('button', { name: 'Edit test Advanced control', exact: true }).count(), 0)
    // Release the UI browser before starting the worker on memory-constrained machines.
    client = await request.newContext({ storageState: await page.context().storageState() })
    await browser.close()
    const runs = await call('POST', `/api/projects/${project.id}/runs/batch`, { environment: 'production', files: [{ fileId: file.id, testNames: ['Create a task'] }], headed: false }, 202)
    let run, deadline = Date.now() + 120000
    do {
      run = await call('GET', `/api/projects/${project.id}/runs/${runs[0].id}`)
      if (['passed', 'failed'].includes(run.status)) break
      await new Promise(resolve => setTimeout(resolve, 500))
    } while (Date.now() < deadline)
    assert.equal(run.status, 'passed', JSON.stringify(run))
    assert.equal(run.totalTests, 2)
    assert.equal(run.passedTests, 2)
    console.log('PASS real guided authoring, refresh persistence, optimistic save conflicts, advanced source preservation and dependency execution against a todo fixture (2/2 passed)')
  } finally {
    if (project && client) {
      await call('POST', `/api/workspaces/${workspace}/projects/${project.id}/archive`, undefined, 204)
      await call('DELETE', `/api/workspaces/${workspace}/projects/${project.id}`, undefined, 204)
    }
    await browser.close()
    if (client) await client.dispose()
    await new Promise(resolve => fixture.close(resolve))
  }
})().catch(error => { console.error(String(error)); process.exitCode = 1 })
