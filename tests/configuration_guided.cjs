const assert=require('node:assert/strict')
const http=require('node:http')
const{randomBytes}=require('node:crypto')
const{createRequire}=require('node:module')
const{chromium}=createRequire(process.cwd()+'/packages/core/package.json')('playwright')
const{register}=require('./browser_auth.cjs')
const API='http://localhost:5000',WEB='http://localhost:5173'
;(async()=>{
 const targetUser='todo-'+randomBytes(5).toString('hex'),targetPassword=randomBytes(20).toString('base64url')
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8')
  if(req.url==='/missing'){res.statusCode=404;res.end('<h1>Missing page</h1>');return}
  if(req.method==='POST'){
   let body='';for await(const part of req)body+=part
   const values=new URLSearchParams(body)
   res.end(values.get('username')===targetUser&&values.get('password')===targetPassword?'<h1>Your tasks</h1>':'<h1>Invalid credentials</h1>');return
  }
  res.end('<form method="POST" action="/login"><label>Username<input name="username"></label><label>Password<input name="password" type="password"></label><button type="submit">Sign in</button></form>')
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const target=`http://127.0.0.1:${server.address().port}`
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1050}})
 let page,workspace,project,other
 const errors=[]
 async function call(client,method,path,data,expected=200){const session=await(await client.request.get(API+'/api/auth/session')).json();const response=await client.request.fetch(API+path,{method,data,timeout:180000,headers:{'X-CSRF-TOKEN':session.csrfToken}});assert.equal(response.status(),expected,`${method} ${path}`);return expected===204?null:response.json()}
 async function choose(label,option){await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click()}
 try{
  await register(context,API);workspace=(await call(context,'GET','/api/workspaces'))[0].id
  project=await call(context,'POST',`/api/workspaces/${workspace}/projects`,{name:'Guided configuration '+randomBytes(4).toString('hex')},201)
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(WEB+`/projects/${project.id}?mode=api`)
  await page.getByRole('region',{name:'Environment configuration',exact:true}).waitFor();assert.equal(await page.getByLabel('Account name',{exact:false}).count(),0)
  await choose('Configuration environment','Local');await page.getByLabel('Application URL',{exact:false}).fill(target)
  await page.getByRole('button',{name:'Save address',exact:true}).click();await page.getByRole('status').filter({hasText:'Address saved.'}).waitFor()
  await page.getByRole('button',{name:'Check connection',exact:true}).click();await page.getByRole('status').filter({hasText:'Application responded (HTTP 200).'}).waitFor()
  await page.getByLabel('Application URL',{exact:false}).fill(target+'/draft')
  page.once('dialog',dialog=>dialog.dismiss());await choose('Configuration environment','Staging');assert.equal(await page.getByLabel('Application URL',{exact:false}).inputValue(),target+'/draft');assert.match(await page.getByRole('button',{name:'Configuration environment',exact:true}).innerText(),/Local/)
  page.once('dialog',dialog=>dialog.accept());await choose('Configuration environment','Staging');await page.getByLabel('Application URL',{exact:false}).fill(target+'/missing');await page.getByRole('button',{name:'Save address',exact:true}).click();await page.getByRole('status').filter({hasText:'Address saved.'}).waitFor();await page.getByRole('button',{name:'Check connection',exact:true}).click();await page.getByRole('status').filter({hasText:'HTTP 404'}).waitFor();await choose('Configuration environment','Local')
  await choose('Application login','No login required');await page.getByRole('status').filter({hasText:'Access settings saved.'}).waitFor();assert.equal(await page.getByRole('region',{name:'Test account configuration',exact:true}).count(),0)
  await choose('Application login','Login required');await page.getByRole('region',{name:'Test account configuration',exact:true}).waitFor();await page.getByRole('button',{name:'Add account',exact:true}).click()
  await page.getByLabel('Account name',{exact:false}).fill('x');await page.getByLabel('Username',{exact:false}).fill(targetUser);await page.getByLabel('Password',{exact:false}).fill(targetPassword)
  await page.getByRole('button',{name:'Save test account',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Password',{exact:false}).inputValue(),targetPassword)
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('dialog',{name:'Add test account',exact:true}).getByRole('button',{name:'Close panel',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:false}).inputValue(),targetPassword)
  await page.getByLabel('Account name',{exact:false}).fill('Todo QA');await page.getByRole('button',{name:'Save test account',exact:true}).click();await page.getByRole('status').filter({hasText:'Test account saved and selected as the default.'}).waitFor();assert.equal(await page.getByLabel('Password',{exact:false}).count(),0)
  let account=(await call(context,'GET',`/api/projects/${project.id}/test-accounts`))[0];assert(!JSON.stringify(account).includes(targetPassword)&&!JSON.stringify(account).includes(targetUser))
  await page.getByRole('button',{name:'Set up login steps',exact:true}).click();await page.getByLabel('Text visible after login',{exact:false}).fill('Your tasks');await page.getByRole('button',{name:'Save login flow',exact:true}).click();await page.getByRole('status').filter({hasText:'Login flow saved.'}).waitFor()
  await page.getByRole('button',{name:'Check login',exact:true}).click();await page.getByRole('status').filter({hasText:'Login steps and the success check passed.'}).waitFor({timeout:60000})
  const setup=await call(context,'GET',`/api/projects/${project.id}/setup/local`);assert.equal(setup.defaultAccountId,account.id);assert(setup.loginFlowId)
  await page.getByRole('button',{name:'Add account',exact:true}).click()
  await page.getByLabel('Account name',{exact:false}).fill('Todo alternative');await page.getByLabel('Username',{exact:false}).fill(targetUser);await page.getByLabel('Password',{exact:false}).fill('incorrect-password')
  await page.getByRole('button',{name:'Save test account',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});await page.getByRole('status').filter({hasText:/account saved/i}).waitFor()
  await choose('Account to verify','Todo alternative');await page.getByRole('button',{name:'Check login',exact:true}).click();await page.getByRole('status').filter({hasText:'Login did not pass.'}).waitFor({timeout:60000})
  assert.equal((await call(context,'GET',`/api/projects/${project.id}/setup/local`)).defaultAccountId,account.id)
  await choose('Account to verify','Todo QA');assert.equal(await page.getByText('Login did not pass.',{exact:false}).count(),0)
  await page.getByRole('button',{name:'Check login',exact:true}).click();await page.getByRole('status').filter({hasText:'Login steps and the success check passed.'}).waitFor({timeout:60000})
  await choose('Account to verify','Todo alternative');assert.equal(await page.getByText('Login steps and the success check passed.',{exact:true}).count(),0)
  await page.getByRole('button',{name:'Edit Todo alternative',exact:true}).click();await page.getByLabel('Password',{exact:false}).fill(targetPassword);await page.getByRole('button',{name:'Save test account',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});await page.getByRole('status').filter({hasText:/account saved/i}).waitFor()
  await page.getByRole('button',{name:'Check login',exact:true}).click();const verified=page.getByRole('status').filter({hasText:'Login steps and the success check passed.'});await verified.waitFor({timeout:60000});assert.match(await verified.innerText(),/Todo alternative.*Checked at/)
  assert.match(await page.getByRole('button',{name:'Default test account',exact:true}).innerText(),/Todo QA/)
  assert.equal((await call(context,'GET',`/api/projects/${project.id}/setup/local`)).defaultAccountId,account.id)
  await choose('Account to verify','Todo QA')
  console.log('PASS selected-account verification succeeds/fails independently, defaults stay unchanged, and changing account clears stale results')

  const explorer=await call(context,'GET',`/api/projects/${project.id}/explorer`);const flow=explorer.files.find(file=>file.id===setup.loginFlowId);assert(flow.content.includes('{{AXTEST_PASSWORD}}')&&!flow.content.includes(targetPassword))
  console.log('PASS saved-vs-verified connection, real guided login, public setup, unsaved-change guards, failed-save input preservation and secret privacy')
  await page.getByRole('button',{name:'Edit Todo QA',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:false}).inputValue(),'');await page.getByLabel('Account name',{exact:false}).fill('Todo account renamed');await page.getByRole('button',{name:'Save test account',exact:true}).click();await page.getByRole('status').filter({hasText:'Test account saved'}).waitFor();await page.getByRole('button',{name:'Check login',exact:true}).click();await page.getByRole('status').filter({hasText:'Login steps and the success check passed.'}).waitFor({timeout:60000})
  await call(context,'PUT',`/api/projects/${project.id}/test-accounts/${account.id}`,{name:'Todo account renamed',environment:'local',variables:{AXTEST_PASSWORD:'incorrect-password'}});const failed=await call(context,'POST',`/api/projects/${project.id}/setup/local/check-login`);assert.equal(failed.ok,false);assert(failed.detail);assert(!JSON.stringify(failed).includes(targetUser))
  await call(context,'PUT',`/api/projects/${project.id}/test-accounts/${account.id}`,{name:'Todo account renamed',environment:'local',variables:{AXTEST_PASSWORD:targetPassword}});assert.equal((await call(context,'POST',`/api/projects/${project.id}/setup/local/check-login`)).ok,true)
  const fresh=await browser.newContext();await fresh.addCookies(await context.cookies());const next=await fresh.newPage();await next.goto(WEB+`/projects/${project.id}/suites?mode=api`);await next.getByRole('region',{name:'Suite selection',exact:true}).waitFor();await next.getByRole('button',{name:'Environment',exact:true}).click();await next.getByRole('option',{name:'Local',exact:true}).click();assert.match(await next.getByRole('button',{name:'Test account',exact:true}).innerText(),/Todo account renamed/);await fresh.close()
  const storage=await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage));assert(!storage.includes(targetPassword)&&!storage.includes(targetUser))
  other=await call(context,'POST',`/api/workspaces/${workspace}/projects`,{name:'Other configuration scope',baseUrl:target},201);await call(context,'PUT',`/api/projects/${other.id}/setup/production`,{loginRequired:true,defaultAccountId:account.id},400);await call(context,'PUT',`/api/projects/${other.id}/setup/production`,{loginRequired:true,loginFlowId:flow.id},400)
  const outsider=await browser.newContext();await register(outsider,API);await call(outsider,'GET',`/api/projects/${project.id}/setup/local`,undefined,404);await call(outsider,'PUT',`/api/projects/${project.id}/test-accounts/${account.id}`,{name:'blocked',environment:'local',variables:{}},404);await outsider.close()
  const viewer=await browser.newContext();const viewerUser=await register(viewer,API);await call(context,'POST',`/api/workspaces/${workspace}/members`,{username:viewerUser.username,role:'Viewer'});await call(viewer,'PUT',`/api/projects/${project.id}/setup/local`,{loginRequired:false},404);await call(viewer,'POST',`/api/projects/${project.id}/setup/local/check-login`,undefined,404);await viewer.close()
  await page.screenshot({path:'tests/screenshots/configuration-guided.png',fullPage:true});await page.setViewportSize({width:760,height:1050});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await call(context,'DELETE',`/api/projects/${project.id}/test-accounts/${account.id}`,undefined,204);assert.equal((await call(context,'GET',`/api/projects/${project.id}/setup/local`)).defaultAccountId,null)
  assert.deepEqual(errors,[]);console.log('PASS account rename/partial credential replacement, genuine login failure, shared defaults across browsers, environment/project/viewer isolation, deletion cleanup and responsive layout')
 }catch(error){console.error('Configuration check at:',page?.url());if(page)console.error('Statuses:',await page.getByRole('status').allTextContents(),'Alerts:',await page.getByRole('alert').allTextContents(),'Browser errors:',errors);if(page)await page.screenshot({path:'tests/screenshots/configuration-guided-error.png',fullPage:true}).catch(()=>{});throw error}
 finally{for(const item of[project,other].filter(Boolean)){try{await call(context,'POST',`/api/workspaces/${workspace}/projects/${item.id}/archive`,undefined,204);await call(context,'DELETE',`/api/workspaces/${workspace}/projects/${item.id}`,undefined,204)}catch{console.error('Verification project retained:',item.id)}}await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(String(error));process.exitCode=1})
