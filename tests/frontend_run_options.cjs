const assert = require('node:assert/strict')
const http = require('node:http')
const { createRequire } = require('node:module')
const { execFileSync } = require('node:child_process')
const { chromium, request } = createRequire(process.cwd() + '/packages/core/package.json')('playwright')
const { register } = require('./browser_auth.cjs')
const API = 'http://localhost:5000', WEB = 'http://localhost:5173'
function visibleWindows() {
  if (process.platform !== 'win32') return []
  const executable = chromium.executablePath().replaceAll("'", "''")
  const text = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `@(Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq '${executable}' -and $_.MainWindowHandle -ne 0 } | ForEach-Object { $_.MainWindowHandle.ToString() }) | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true, timeout: 10000 }).trim()
  const result = text ? JSON.parse(text) : []
  return Array.isArray(result) ? result : [result]
}
;(async () => {
  let pings = []
  const fixture = http.createServer((req, res) => {
    if (req.url.startsWith('/ping?')) { pings.push(Number(new URL(req.url, 'http://localhost').searchParams.get('at'))); res.end('ok'); return }
    res.setHeader('Content-Type', 'text/html')
    res.end('<!doctype html><html><body><button onclick="fetch(\'/ping?at=\'+Date.now());if(++window.count===4)document.querySelector(\'h1\').textContent=\'Done\'">Ping</button><h1>Ready</h1><script>window.count=0</script></body></html>')
  })
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launch()
  let client, project, workspace, page
  const errors = []
  async function call(method, path, data, expected = 200) {
    const session = await (await client.get(API + '/api/auth/session')).json()
    const response = await client.fetch(API + path, { method, data, timeout: 180000, headers: { 'X-CSRF-TOKEN': session.csrfToken } })
    assert.equal(response.status(), expected, `${method} ${path}`)
    return response.status() === 204 ? null : response.json()
  }
  async function waitRun(runId, expectVisible, previousHandles) {
    const previous = new Set(previousHandles)
    let observed = false, detail, deadline = Date.now() + 120000
    do {
      detail = await call('GET', `/api/projects/${project.id}/runs/${runId}`)
      if (visibleWindows().some(handle => !previous.has(handle))) observed = true
      if (['passed', 'failed'].includes(detail.status)) break
      await new Promise(resolve => setTimeout(resolve, 250))
    } while (Date.now() < deadline)
    assert.equal(detail.status, 'passed', JSON.stringify(detail))
    if (process.platform === 'win32') assert.equal(observed, expectVisible, 'Desktop browser visibility must match Run settings.')
    assert.equal(pings.length, 4)
    const ordered = [...pings].sort((a, b) => a - b)
    return ordered.slice(1).map((time, index) => time - ordered[index])
  }
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
    page.on('pageerror', error => errors.push(error.message))
    client = page.request
    await register(page.context(), API)
    workspace = (await call('GET', '/api/workspaces'))[0].id
    project = await call('POST', `/api/workspaces/${workspace}/projects`, { name: 'Run settings verification ' + Date.now(), baseUrl: `http://127.0.0.1:${fixture.address().port}` }, 201)
    const content = '---\ntitle: Browser pacing\n---\nTEST "Paced clicks"\n ID paced-clicks\nSTEPS\n navigate to "/"\n click "Ping"\n click "Ping"\n click "Ping"\n click "Ping"\nASSERT\n assert "Done" is_visible\n'
    const file = await call('POST', `/api/projects/${project.id}/files`, { name: 'paced', folder: 'modules', content })
    const batch = { environment: 'production', files: [{ fileId: file.id }] }
    await call('POST', `/api/projects/${project.id}/runs/batch`, { ...batch, slowMoMs: -1 }, 400)
    await call('POST', `/api/projects/${project.id}/runs/file?wait=false`, { environment: 'production', fileId: file.id, content, slowMoMs: 99999 }, 400)
    assert.deepEqual(await call('GET', `/api/projects/${project.id}/runs`), [])
    await page.goto(`${WEB}/projects/${project.id}/suites?mode=api`)
    await page.getByLabel('Select suite Browser pacing', { exact: true }).check()
    const settings = page.getByRole('region', { name: 'Run settings', exact: true })
    await page.getByRole('button', { name: 'Run settings', exact: true }).first().click()
    await settings.getByRole('checkbox', { name: 'Show browser', exact: true }).check()
    await settings.getByRole('button', { name: 'Execution speed', exact: true }).click()
    await page.getByRole('option', { name: 'Fast · no added delay', exact: true }).click()
    await settings.getByRole('button', { name: 'Close run settings', exact: true }).click()
    await page.getByRole('button', { name: 'Edit test Paced clicks', exact: true }).click()
    await page.getByRole('region', { name: 'Suite editor context', exact: true }).waitFor()
    await page.getByRole('region', { name: 'Suite editor context', exact: true }).locator('summary').first().click()
    await page.getByRole('button', { name: 'Run settings', exact: true }).first().click()
    assert(await settings.getByRole('checkbox', { name: 'Show browser', exact: true }).isChecked())
    assert.match(await settings.getByRole('button', { name: 'Execution speed', exact: true }).innerText(), /Fast/)
    await settings.getByRole('button', { name: 'Execution speed', exact: true }).click()
    await page.getByRole('option', { name: 'Slow · 1 second', exact: true }).click()
    await settings.getByRole('button', { name: 'Close run settings', exact: true }).click()
    await page.getByRole('link', { name: 'Back to suites', exact: true }).click()
    await page.getByRole('region', { name: 'Suite selection', exact: true }).waitFor()
    await page.reload()
    await page.getByRole('button', { name: 'Run settings', exact: true }).first().click()
    assert(await settings.getByRole('checkbox', { name: 'Show browser', exact: true }).isChecked())
    assert.match(await settings.getByRole('button', { name: 'Execution speed', exact: true }).innerText(), /Slow/)
    await settings.getByRole('button', { name: 'Close run settings', exact: true }).click()
    assert(!(await page.getByRole('region', { name: 'Selected tests', exact: true }).getByRole('button', { name: 'Run selected', exact: true }).isDisabled()), 'Run should remain ready after restoring settings and selection.')
    const slowBaseline = visibleWindows()
    const submitted = page.waitForResponse(response => response.url().endsWith('/runs/batch') && response.request().method() === 'POST')
    submitted.catch(() => {})
    await page.getByRole('region', { name: 'Selected tests', exact: true }).getByRole('button', { name: 'Run selected', exact: true }).click()
    const response = await submitted
    assert.equal(response.status(), 202)
    assert.equal(response.request().postDataJSON().headed, true)
    assert.equal(response.request().postDataJSON().slowMoMs, 1000)
    const queued = await response.json()
    assert.equal(await page.getByRole('dialog').count(), 0)
    assert.deepEqual(errors, [])
    // Release the UI browser before executing worker browsers on memory-constrained machines.
    client = await request.newContext({ storageState: await page.context().storageState() })
    await browser.close()
    const slow = await waitRun(queued[0].id, true, slowBaseline)
    assert(slow.every(gap => gap >= 750), 'Slow mode must visibly pace the actual clicks: ' + JSON.stringify(slow))
    pings = []
    const fastBaseline = visibleWindows()
    const fastRun = await call('POST', `/api/projects/${project.id}/runs/file?wait=false`, { environment: 'production', fileId: file.id, content, headed: true, slowMoMs: 0 }, 202)
    const fast = await waitRun(fastRun.id, true, fastBaseline)
    assert(Math.max(...fast) < Math.min(...slow), 'Zero delay must not fall back to the old 400 ms delay.')
    pings = []
    const headlessBaseline = visibleWindows()
    const headlessRun = await call('POST', `/api/projects/${project.id}/runs/batch`, { ...batch, headed: false, slowMoMs: 1000 }, 202)
    const headless = await waitRun(headlessRun[0].id, false, headlessBaseline)
    assert(Math.max(...headless) < Math.min(...slow), 'Headless execution must ignore the saved visible-browser delay.')
    console.log('PASS settings shared between Suites/editor and refresh, real visible Slow/Fast runs, headless full-speed execution, both API payloads and rejection before queueing invalid delays')
  } catch (error) {
    if (page && !page.isClosed()) { console.error('At:', page.url(), 'errors:', errors, 'body:', await page.locator('body').innerText()); await page.screenshot({ path: 'tests/screenshots/run-settings-error.png', fullPage: true }).catch(() => {}) }
    throw error
  } finally {
    try {
      if (project && client) { await call('POST', `/api/workspaces/${workspace}/projects/${project.id}/archive`, undefined, 204); await call('DELETE', `/api/workspaces/${workspace}/projects/${project.id}`, undefined, 204) }
    } finally { await browser.close(); if (client) await client.dispose(); await new Promise(resolve => fixture.close(resolve)) }
  }
})().catch(error => { console.error(String(error)); process.exitCode = 1 })
