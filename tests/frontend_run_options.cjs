const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const { execFileSync } = require('node:child_process')
const { chromium } = createRequire(process.cwd()+'/packages/core/package.json')('playwright')
const { register } = require('./browser_auth.cjs')
const API='http://localhost:5000', WEB='http://localhost:5173'
;(async()=>{
  const browser=await chromium.launch()
  function visibleChromiumWindows() {
    if (process.platform !== 'win32') return []
    const executable = chromium.executablePath().replaceAll("'", "''")
    const output = execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`@(Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq '${executable}' -and $_.MainWindowHandle -ne 0 } | ForEach-Object { $_.MainWindowHandle.ToString() }) | ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true,timeout:10000}).trim()
    const result = output ? JSON.parse(output) : []
    return Array.isArray(result) ? result : [result]
  }
  let page,workspace,project
  async function call(method,path,data) {
    const session=await (await page.request.get(API+'/api/auth/session')).json()
    const response=await page.request.fetch(API+path,{method,data,timeout:180000,headers:{'X-CSRF-TOKEN':session.csrfToken}})
    assert(response.ok(), `${method} ${path}: ${response.status()}`)
    return response.status()===204 ? null : response.json()
  }
  async function chooseEnvironment(current,next) {
    await page.getByRole('button',{name:current,exact:true}).click()
    await page.getByRole('option',{name:next,exact:true}).click()
  }
  try {
    page=await browser.newPage({viewport:{width:1100,height:850}})
    page.setDefaultTimeout(30000)
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await register(page.context(),API)
    workspace=(await call('GET','/api/workspaces'))[0].id
    project=await call('POST',`/api/workspaces/${workspace}/projects`,{name:'Run options verification '+Date.now(),baseUrl:WEB})
    const file=await call('POST',`/api/projects/${project.id}/files`,{name:'visible',folder:'modules'})
    await call('PUT',`/api/projects/${project.id}/files/${file.id}`,{content:'TEST "Visible browser login page"\n STEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\n ASSERT\n assert "Username" is_visible'})
    await page.goto(WEB+`/editor?project=${project.id}&file=modules/visible.axtest&mode=api`)
    await page.locator('.cm-content').waitFor()
    await page.getByRole('button',{name:'Edit Staging URL',exact:true}).click()
    await page.getByLabel('Staging URL',{exact:true}).fill(WEB+'/staging')
    await page.getByRole('button',{name:'Save Staging URL',exact:true}).click()
    await chooseEnvironment('Staging','Local')
    await page.getByLabel('Local URL',{exact:true}).fill(WEB+'/local')
    await page.getByRole('button',{name:'Save Local URL',exact:true}).click()
    await chooseEnvironment('Local','Production')
    await page.getByRole('button',{name:'Edit Production URL',exact:true}).click()
    await page.getByLabel('Production URL',{exact:true}).fill(WEB+'/production')
    await page.getByRole('button',{name:'Save Production URL',exact:true}).click()
    const environments=await call('GET',`/api/projects/${project.id}/environments`)
    assert.equal(environments.find(e=>e.name==='staging').baseUrl,WEB+'/staging')
    assert.equal(environments.find(e=>e.name==='local').baseUrl,WEB+'/local')
    const stored=await call('GET',`/api/workspaces/${workspace}/projects/${project.id}`)
    assert.equal(stored.baseUrl,WEB+'/production')
    await page.reload();await page.locator('.cm-content').waitFor()
    await chooseEnvironment('Staging','Production')
    await page.getByRole('button',{name:'Edit Production URL',exact:true}).click()
    assert.equal(await page.getByLabel('Production URL',{exact:true}).inputValue(),WEB+'/production')
    await page.getByRole('button',{name:'Cancel',exact:true}).click()
    console.log('PASS visible URL controls at 1100px; Production, Staging and Local edits persist after refresh')
    await page.getByRole('button',{name:'Run',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'Run options',exact:true})
    await dialog.waitFor()
    const bounds=await dialog.boundingBox()
    assert(Math.abs(bounds.x+bounds.width/2-550)<5)
    assert(Math.abs(bounds.y+bounds.height/2-425)<5)
    await page.getByRole('checkbox',{name:'Show browser during this run',exact:true}).check()
    const previousWindows = new Set(visibleChromiumWindows())
    let observedWindow = false
    const submitted=page.waitForResponse(r=>r.url().includes('/runs/file?wait=false') && r.request().method()==='POST')
    await page.getByRole('button',{name:'Start run',exact:true}).click()
    const response=await submitted
    assert.equal(response.request().postDataJSON().headed,true)
    assert(response.ok())
    const run=await response.json()
    let detail=run, deadline=Date.now()+150000
    while(!['passed','failed'].includes(detail.status)&&Date.now()<deadline) {
      if (process.platform === 'win32' && visibleChromiumWindows().some(id=>!previousWindows.has(id))) observedWindow = true
      await new Promise(resolve=>setTimeout(resolve,500))
      detail=await call('GET',`/api/projects/${project.id}/runs/${run.id}`)
    }
    assert.equal(detail.status,'passed',JSON.stringify(detail))
    if (process.platform === 'win32') assert(observedWindow,'A new visible Chromium desktop window must appear, not just a headed request flag.')
    await page.getByText('1/1 passed',{exact:true}).first().waitFor()
    assert.deepEqual(errors,[])
    console.log('PASS centered run dialog, headed execution and a new visible Chromium desktop window')
  } finally {
    if(project) { await call('POST',`/api/workspaces/${workspace}/projects/${project.id}/archive`); await call('DELETE',`/api/workspaces/${workspace}/projects/${project.id}`) }
    await browser.close()
  }
})().catch(error=>{console.error(error);process.exitCode=1})
