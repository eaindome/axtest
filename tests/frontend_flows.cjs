const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const { chromium } = createRequire(process.cwd()+'/packages/core/package.json')('playwright')
const { parseContent } = require('../packages/core/dist/index.js')
const { register } = require('./browser_auth.cjs')
const API='http://localhost:5000', WEB='http://localhost:5173'
;(async()=>{
  const browser=await chromium.launch()
  let page,project,workspace
  async function call(method,path,data) {
    const session=await (await page.request.get(API+'/api/auth/session')).json()
    const response=await page.request.fetch(API+path,{method,data,headers:{'X-CSRF-TOKEN':session.csrfToken}})
    assert(response.ok(), `${method} ${path}: ${response.status()}`)
    return response.status()===204 ? null : response.json()
  }
  try {
    page=await browser.newPage({viewport:{width:1440,height:1000}})
    page.setDefaultTimeout(30000)
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await register(page.context(),API)
    workspace=(await call('GET','/api/workspaces'))[0].id
    project=await call('POST',`/api/workspaces/${workspace}/projects`,{name:'Visual flow verification '+Date.now(),baseUrl:WEB})
    const file=await call('POST',`/api/projects/${project.id}/files`,{name:'self-login',folder:'auth'})
    const original=readFileSync('tests/self/auth/self-login.axtest','utf8')
    await call('PUT',`/api/projects/${project.id}/files/${file.id}`,{content:original})
    await page.goto(WEB+`/editor?project=${project.id}&file=auth/self-login.axtest&mode=api`)
    await page.locator('.cm-content').waitFor()
    await page.getByRole('tab',{name:'Visual',exact:true}).click()
    await page.getByText('Authentication flow.',{exact:false}).waitFor()
    assert.equal(await page.getByText('No test cases yet',{exact:true}).count(),0)
    assert.equal(await page.getByLabel('Flow name').inputValue(),'self-login')
    const waits=page.getByLabel('Wait target')
    assert.equal(await waits.count(),2)
    assert.equal(await waits.first().inputValue(),'Username')
    await waits.first().fill('Username field')
    const saved=page.waitForResponse(r=>r.url().endsWith('/files/'+file.id)&&r.request().method()==='PUT')
    await page.getByRole('button',{name:'Save',exact:true}).click()
    assert((await saved).ok())
    const stored=(await call('GET',`/api/projects/${project.id}/explorer`)).files.find(f=>f.id===file.id).content
    assert(stored.includes('wait for "Username field" to appear'))
    assert(!/^TEST /m.test(stored))
    assert(!stored.includes('navigate to wait for'))
    assert.equal(parseContent(stored).isFlow,true)
    await page.getByRole('tab',{name:'Code',exact:true}).click()
    assert((await page.locator('.cm-content').innerText()).includes('AUTH self-login'))
    await page.reload(); await page.locator('.cm-content').waitFor()
    await page.getByRole('tab',{name:'Visual',exact:true}).click()
    assert.equal(await page.getByLabel('Wait target').first().inputValue(),'Username field')
    assert.deepEqual(errors,[])
    console.log('PASS AUTH flow visual steps, wait editing, saved flow syntax, code round-trip and refresh persistence')
  } finally {
    if(project) { await call('POST',`/api/workspaces/${workspace}/projects/${project.id}/archive`); await call('DELETE',`/api/workspaces/${workspace}/projects/${project.id}`) }
    await browser.close()
  }
})().catch(error=>{console.error(error);process.exitCode=1})
