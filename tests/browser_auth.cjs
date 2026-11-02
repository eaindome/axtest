const { randomBytes } = require('node:crypto')
// Dedicated verification identity, never the owner's password. Browser request shares its cookies.
async function register(context, api) {
  const session = await (await context.request.get(api + '/api/auth/session')).json()
  const credentials = { name: 'Browser verification', username: 'authcheck_' + randomBytes(6).toString('hex'), password: randomBytes(18).toString('base64url') }
  const response = await context.request.post(api + '/api/auth/register', {data: credentials, headers:{'X-CSRF-TOKEN':session.csrfToken}})
  if (!response.ok()) throw new Error('Browser verification registration failed: ' + response.status())
  return credentials
}
async function signIn(page, web, credentials) {
  await page.goto(web + '/login?mode=api')
  await page.getByLabel('Username').fill(credentials.username)
  await page.getByLabel('Password', { exact: false }).fill(credentials.password)
  await page.getByRole('button', {name:'Sign in',exact:true}).click()
  await page.getByRole('heading',{name:'A clearer view of quality.'}).waitFor()
}
module.exports = { register, signIn }
