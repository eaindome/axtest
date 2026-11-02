// Verify the installed self-test project through the editor. One JSON credential line on stdin.
const assert = require('node:assert/strict')
const { createInterface } = require('node:readline')
const { createRequire } = require('node:module')
const { chromium, request } = createRequire(process.cwd() + '/packages/core/package.json')('playwright')
const { register, signIn } = require('./browser_auth.cjs')
const API = 'http://localhost:5000', WEB = 'http://localhost:5173'
const input = createInterface({input:process.stdin})
input.once('line', line => { input.close(); void main(JSON.parse(line)) })
let secrets = []
async function main(owner) {
  secrets = [owner.password]
  const browser = await chromium.launch()
  const target = await request.newContext()
  let targetWorkspace, caseName
  async function targetCall(method,path,data) {
    const session = await (await target.get(API+'/api/auth/session')).json()
    const response = await target.fetch(API+path,{method,data,timeout:180000,headers:{'X-CSRF-TOKEN':session.csrfToken}})
    assert(response.ok(), `Target cleanup ${method} ${path}: ${response.status()}`)
    return response.status()===204 ? null : response.json()
  }
  try {
    const credentials = await register({request:target},API)
    secrets.push(credentials.password)
    targetWorkspace = (await targetCall('GET','/api/workspaces'))[0].id
    const page = await browser.newPage({viewport:{width:1440,height:1100}})
    page.setDefaultTimeout(45000)
    const errors=[]; page.on('pageerror',error=>errors.push(error.message))
    await signIn(page,WEB,owner)
    const workspaces = await (await page.request.get(API+'/api/workspaces')).json()
    const projects = await (await page.request.get(API+`/api/workspaces/${workspaces[0].id}/projects`)).json()
    const project = projects.find(p=>p.name==='axtest Self Test')
    assert(project,'Install the project with python tests/self/setup.py first.')
    const historyOnly = process.argv.includes('--history-only')
    for (const [file,total] of historyOnly ? [] : [['authentication',4],['workspace',2],['evidence',0]]) {
      await page.goto(WEB+`/editor?project=${project.id}&file=modules/${file}.axtest`)
      await page.locator('.cm-content').waitFor()
      const submitted = page.waitForResponse(r=>r.url().includes('/runs/file?wait=false') && r.request().method()==='POST')
      await page.getByRole('button',{name:'Run',exact:true}).click()
      if (total) {
        await page.getByRole('region',{name:'Runtime inputs'}).waitFor()
        // Cancel must not submit a job or retain previously entered secrets.
        if (file==='authentication') {
          await page.getByLabel('AXTEST_PASSWORD').fill(credentials.password)
          await page.getByRole('button',{name:'Cancel run',exact:true}).click()
          await page.getByRole('button',{name:'Run',exact:true}).click()
          assert.equal(await page.getByLabel('AXTEST_PASSWORD').inputValue(),'')
        }
        await page.getByLabel('AXTEST_USERNAME').fill(credentials.username)
        await page.getByLabel('AXTEST_PASSWORD').fill(credentials.password)
        if (file==='workspace') caseName = await page.getByLabel('AXTEST_CASE').inputValue()
      }
      await page.getByRole('button',{name:'Start run',exact:true}).click()
      const response = await submitted
      assert(response.ok(), 'Self-test submission failed: '+response.status())
      const run = await response.json()
      let detail = run
      const deadline = Date.now()+180000
      while (!['passed','failed'].includes(detail.status) && Date.now()<deadline) {
        await new Promise(resolve=>setTimeout(resolve,300))
        detail = await (await page.request.get(API+`/api/projects/${project.id}/runs/${run.id}`)).json()
      }
      assert.equal(detail.status,total ? 'passed':'failed', JSON.stringify({file,error:detail.errorMessage,failures:detail.results?.filter(r=>r.status==='failed')}))
      await page.getByText(total ? `${total}/${total} passed` : '0/1 passed',{exact:true}).first().waitFor()
      assert(!JSON.stringify(detail).includes(credentials.password))
      assert(!await page.evaluate(password=>JSON.stringify(localStorage).includes(password),credentials.password))
      if (total) {
        assert(detail.results.every(r=>!r.screenshotUrl && r.steps.every(s=>!s.screenshotUrl)))
        assert.equal(await page.getByLabel('AXTEST_PASSWORD').count(),0)
      } else {
        await page.getByRole('button',{name:'View screenshot',exact:true}).click()
        await page.getByAltText('Screenshot captured when this test failed').waitFor()
      }
      console.log(`PASS editor self-test ${file}: ${total ? total+'/'+total : 'intentional failure with screenshot'}; run ${run.id}`)
    }
    await page.goto(WEB+`/projects/${project.id}`)
    for (const file of ['authentication','workspace','evidence']) await page.getByRole('button').filter({hasText:`modules/${file}.axtest`}).first().waitFor()
    for (let attempt=0;attempt<2;attempt++) {
      if (attempt) await page.reload()
      await page.getByRole('button').filter({hasText:'modules/evidence.axtest'}).first().click()
      await page.getByText('Evidence control intentionally fails',{exact:true}).waitFor()
      await page.getByRole('button',{name:'View screenshot',exact:true}).click()
      await page.getByAltText('Screenshot captured when this test failed').waitFor()
    }
    console.log('PASS run history lists all three suites and failure evidence survives refresh')
    assert.deepEqual(errors,[])
    if (historyOnly) return
    const probe = await targetCall('POST',`/api/workspaces/${targetWorkspace}/projects`,{name:'Runtime input verification',baseUrl:WEB})
    try {
      const file = await targetCall('POST',`/api/projects/${probe.id}/files`,{name:'redaction',folder:'modules'})
      const session = await (await target.get(API+'/api/auth/session')).json()
      const rejected = await target.post(API+`/api/projects/${probe.id}/runs/file`,{headers:{'X-CSRF-TOKEN':session.csrfToken},data:{fileId:file.id,content:'TEST "Blocked"',environment:'production',variables:{NODE_OPTIONS:'blocked'}}})
      assert.equal(rejected.status(),400)
      const detail = await targetCall('POST',`/api/projects/${probe.id}/runs/file`,{fileId:file.id,content:'TEST "Redaction check"\n STEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\n click "{{AXTEST_PASSWORD}}"\n ASSERT\n assert "Never appears" is_visible',environment:'production',variables:{AXTEST_PASSWORD:credentials.password}})
      assert.equal(detail.status,'failed')
      assert(!JSON.stringify(detail).includes(credentials.password))
      assert(JSON.stringify(detail).includes('[redacted]'))
      assert(detail.results.every(r=>!r.screenshotUrl))
      console.log('PASS runtime variable allowlist, error redaction and screenshot suppression')
    } finally { await targetCall('POST',`/api/workspaces/${targetWorkspace}/projects/${probe.id}/archive`); await targetCall('DELETE',`/api/workspaces/${targetWorkspace}/projects/${probe.id}`) }
  } catch(error) {
    console.error(secrets.filter(Boolean).reduce((text,secret)=>text.replaceAll(secret,'[redacted]'),String(error)))
    process.exitCode=1
  } finally {
    if (targetWorkspace && caseName) {
      const projects = await targetCall('GET',`/api/workspaces/${targetWorkspace}/projects`)
      for (const project of projects.filter(p=>p.name==='Self test '+caseName)) { await targetCall('POST',`/api/workspaces/${targetWorkspace}/projects/${project.id}/archive`); await targetCall('DELETE',`/api/workspaces/${targetWorkspace}/projects/${project.id}`) }
    }
    await target.dispose(); await browser.close()
  }
}
