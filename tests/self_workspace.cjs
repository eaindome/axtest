const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const { request } = createRequire(process.cwd() + '/packages/core/package.json')('playwright')
const { register } = require('./browser_auth.cjs')
const API = 'http://localhost:5000'
;(async () => {
  const client = await request.newContext()
  let workspace, project
  async function call(method, path, data, expected = 200) {
    const session = await (await client.get(API + '/api/auth/session')).json()
    const response = await client.fetch(API + path, { method, data, timeout: 180000, headers: { 'X-CSRF-TOKEN': session.csrfToken } })
    assert.equal(response.status(), expected, `${method} ${path}`)
    return response.status() === 204 ? null : response.json()
  }
  try {
    const identity = await register({ request: client }, API)
    workspace = (await call('GET', '/api/workspaces'))[0].id
    project = await call('POST', `/api/workspaces/${workspace}/projects`, { name: 'Workspace self-check ' + Date.now(), baseUrl: 'http://localhost:5173' }, 201)
    await call('POST', `/api/projects/${project.id}/files`, { name: 'self-login', folder: 'auth', content: readFileSync('tests/self/auth/self-login.axtest', 'utf8') })
    const file = await call('POST', `/api/projects/${project.id}/files`, { name: 'workspace', folder: 'modules', content: readFileSync('tests/self/modules/workspace.axtest', 'utf8') })
    const account = await call('POST', `/api/projects/${project.id}/test-accounts`, { name: 'Disposable self-test identity', environment: 'production', variables: { AXTEST_USERNAME: identity.username, AXTEST_PASSWORD: identity.password } })
    const queued = await call('POST', `/api/projects/${project.id}/runs/batch`, { environment: 'production', accountId: account.id, files: [{ fileId: file.id }] }, 202)
    let run, deadline = Date.now() + 180000
    do {
      run = await call('GET', `/api/projects/${project.id}/runs/${queued[0].id}`)
      if (['passed', 'failed'].includes(run.status)) break
      await new Promise(resolve => setTimeout(resolve, 500))
    } while (Date.now() < deadline)
    const diagnostic = JSON.stringify(run).replaceAll(identity.password, '[redacted]').replaceAll(identity.username, '[redacted]')
    assert.equal(run.status, 'passed', diagnostic)
    assert.equal(run.passedTests, 2)
    console.log('PASS axtest tests its new project-to-editor draft journey and account settings (2/2 passed)')
  } finally {
    try {
      if (workspace) {
        const projects = await call('GET', `/api/workspaces/${workspace}/projects`)
        for (const item of projects.filter(item => item.id === project?.id || item.name.startsWith('Self test '))) {
          await call('POST', `/api/workspaces/${workspace}/projects/${item.id}/archive`, undefined, 204)
          await call('DELETE', `/api/workspaces/${workspace}/projects/${item.id}`, undefined, 204)
        }
      }
    } finally { await client.dispose() }
  }
})().catch(error => { console.error(String(error)); process.exitCode = 1 })
