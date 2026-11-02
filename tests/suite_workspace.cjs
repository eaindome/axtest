const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const { mkdirSync } = require('node:fs')
const { createRequire } = require('node:module')
const { chromium } = createRequire(process.cwd()+'/packages/core/package.json')('playwright')
const { register } = require('./browser_auth.cjs')
const API='http://localhost:5000', WEB='http://localhost:5173'
;(async()=>{
  const browser=await chromium.launch()
  mkdirSync('tests/screenshots',{recursive:true})
  let page,workspace,project
  const browserErrors=[]
  const privateValues={username:'target-'+randomBytes(6).toString('hex'),password:randomBytes(24).toString('base64url')}
  async function call(method,path,data) {
    const session=await (await page.request.get(API+'/api/auth/session')).json()
    const response=await page.request.fetch(API+path,{method,data,timeout:180000,headers:{'X-CSRF-TOKEN':session.csrfToken}})
    assert(response.ok(),`${method} ${path}: ${response.status()}`)
    return response.status()===204 ? null : response.json()
  }
  async function submit(button, expected, fileCount, headed=false) {
    const submitted=page.waitForResponse(response=>response.url()===API+`/api/projects/${project.id}/runs/batch` && response.request().method()==='POST')
    await page.getByRole('button',{name:button,exact:true}).click()
    const response=await submitted
    assert(response.ok(),'Suite submission failed: '+response.status())
    const payload=response.request().postDataJSON()
    assert.equal(payload.files.length,fileCount)
    assert.equal(payload.headed,headed)
    assert(!response.request().postData().includes(privateValues.password))
    assert.equal(await page.getByRole('dialog',{name:'Run options',exact:true}).count(),0)
    const runs=await response.json()
    let details,deadline=Date.now()+180000
    do {
      details=await Promise.all(runs.map(run=>call('GET',`/api/projects/${project.id}/runs/${run.id}`)))
      if(details.every(run=>['passed','failed'].includes(run.status))) break
      await new Promise(resolve=>setTimeout(resolve,500))
    } while(Date.now()<deadline)
    assert(details.every(run=>['passed','failed'].includes(run.status)))
    const region=page.getByRole('region',{name:'Suite results',exact:true})
    await region.getByRole('status').filter({hasText:expected}).waitFor()
    assert(!JSON.stringify(details).includes(privateValues.password))
    return details
  }
  try {
    page=await browser.newPage({viewport:{width:1500,height:1050}})
    page.setDefaultTimeout(45000)
    const errors=browserErrors,calls=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>{if(req.url().startsWith(API)) calls.push(req.url())})
    await register(page.context(),API)
    workspace=(await call('GET','/api/workspaces'))[0].id
    project=await call('POST',`/api/workspaces/${workspace}/projects`,{name:'Suite workspace verification '+Date.now(),baseUrl:WEB})
    const sources={
      credentials:'TEST "Uses saved account"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\n type "{{AXTEST_USERNAME}}" in "Username"\n type "{{AXTEST_PASSWORD}}" in "Password"\nASSERT\n assert "Username" equals "{{AXTEST_USERNAME}}"\nTEST "Optional control"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\nASSERT\n assert "Username" is_visible',
      public:'TEST "Public page"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\nASSERT\n assert "Username" is_visible',
      evidence:'TEST "Expected evidence control"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\nASSERT\n assert "SUITE INTENTIONALLY MISSING" is_visible'
    }
    for(const [name,content] of Object.entries(sources)) {
      const file=await call('POST',`/api/projects/${project.id}/files`,{name,folder:'modules'})
      await call('PUT',`/api/projects/${project.id}/files/${file.id}`,{content})
    }
    await page.goto(WEB+`/suites?project=${project.id}&mode=api`)
    const suites=page.getByRole('region',{name:'Suite selection',exact:true})
    await suites.waitFor()
    assert(await page.getByRole('button',{name:'Debug',exact:true}).isDisabled())
    await page.getByLabel('Uses saved account').check()
    await page.getByRole('checkbox',{name:'Select suite modules/public.axtest',exact:true}).check()
    await page.getByRole('button',{name:'Configuration',exact:true}).click()
    await page.getByRole('button',{name:'Application login',exact:true}).click();await page.getByRole('option',{name:'Login required',exact:true}).click();await page.getByRole('button',{name:'Add account',exact:true}).click()
    await page.getByRole('button',{name:'Application login',exact:true}).click();await page.getByRole('option',{name:'Login required',exact:true}).click();await page.getByRole('button',{name:'Add account',exact:true}).click()
    await page.getByLabel('Account name',{exact:false}).fill('Saved QA account')
    await page.getByLabel('Username',{exact:false}).fill(privateValues.username)
    await page.getByLabel('Password',{exact:false}).fill(privateValues.password)
    const accountSaved=page.waitForResponse(response=>response.url().endsWith('/test-accounts') && response.request().method()==='POST')
    await page.getByRole('button',{name:'Save test account',exact:true}).click()
    const savedResponse=await accountSaved;assert(savedResponse.ok())
    const account=await savedResponse.json()
    assert(!JSON.stringify(account).includes(privateValues.password))
    await page.getByRole('status').filter({hasText:'Test account saved'}).waitFor()
    await page.getByRole('navigation',{name:'Project navigation'}).getByRole('link',{name:'Test suites',exact:true}).click()
    await suites.waitFor()
    await page.reload();await suites.waitFor()
    assert.match(await page.getByRole('button',{name:'Environment',exact:true}).innerText(),/Production/)
    assert.match(await page.getByRole('button',{name:'Test account',exact:true}).innerText(),/Saved QA account/)
    const stored=await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))
    assert(!stored.includes(privateValues.password))
    let results=await submit('Run selected','2/2 passed',2)
    assert(results.every(run=>run.status==='passed'))
    assert.equal(results.reduce((sum,run)=>sum+run.totalTests,0),2,'Individual selection must exclude the optional case.')
    console.log('PASS saved account and selection survive refresh; two-file execution runs directly with one unified result')
    await page.reload();await suites.waitFor()
    await page.getByRole('region',{name:'Suite results',exact:true}).getByRole('status').filter({hasText:'2/2 passed'}).waitFor()
    await suites.getByRole('button').filter({hasText:'modules/credentials.axtest'}).click()
    await page.getByLabel('Uses saved account').uncheck()
    results=await submit('Watch selected','1/1 passed',1,true)
    assert.equal(results[0].status,'passed')
    console.log('PASS Watch uses the selected saved setup and results restore after reload')
    await suites.getByRole('button',{name:'Clear',exact:true}).click()
    await page.getByRole('checkbox',{name:'Select suite modules/evidence.axtest',exact:true}).check()
    results=await submit('Run selected','0/1 passed',1)
    assert.equal(results[0].status,'failed')
    assert(results[0].results[0].screenshotUrl)
    await page.getByRole('button',{name:'View screenshot',exact:true}).click()
    await page.getByAltText('Screenshot captured when this test failed').waitFor()
    await submit('Rerun failed','0/1 passed',1)
    await page.screenshot({path:'tests/screenshots/suite-workspace.png',fullPage:true})
    assert.deepEqual(errors,[])
    console.log('PASS unified failure evidence and one-click rerun of failed cases')
    const mark=calls.length
    await page.getByRole('switch',{name:'Toggle mock API'}).click()
    await page.getByLabel('Username').fill('mock-suite-user')
    await page.getByLabel('Password').fill('mock-only')
    await page.getByRole('button',{name:'Sign in',exact:true}).click()
    await page.getByRole('link',{name:'Test suites',exact:true}).click()
    await page.getByRole('region',{name:'Suite selection',exact:true}).waitFor()
    await page.getByRole('checkbox',{name:/Select suite /}).first().check()
    assert(await page.getByRole('button',{name:'Watch selected',exact:true}).isDisabled())
    await page.getByRole('button',{name:'Run selected',exact:true}).click()
    await page.getByRole('region',{name:'Suite results',exact:true}).getByRole('status').waitFor()
    assert.equal(calls.length,mark,'Mock suite execution must not call the real API.')
    assert.deepEqual(errors,[])
    console.log('PASS mock suite execution stays isolated from API data')
  } catch(error) {
    console.error(Object.values(privateValues).reduce((text,value)=>text.replaceAll(value,'[redacted]'),String(error)))
    if(page) { const debug=JSON.stringify({url:page.url(),errors:browserErrors,body:await page.locator('body').innerText()});console.error(Object.values(privateValues).reduce((text,value)=>text.replaceAll(value,'[redacted]'),debug));await page.screenshot({path:'tests/screenshots/suite-workspace-error.png',fullPage:true}) }
    process.exitCode=1
  } finally {
    if(project) {
      // Mode changes do not affect this authenticated browser request context.
      try { await call('POST',`/api/workspaces/${workspace}/projects/${project.id}/archive`); await call('DELETE',`/api/workspaces/${workspace}/projects/${project.id}`) } catch { console.error('Verification project retained while runs finish:',project.id) }
    }
    await browser.close()
  }
})().catch(error=>{console.error(String(error));process.exitCode=1})
