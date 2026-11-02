// One JSON line on stdin: {"username":"...","password":"..."}. Never saved to disk.
const { createInterface } = require('node:readline')
const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')
const input = createInterface({ input: process.stdin })
input.once('line', line => {
  input.close()
  const { username, password } = JSON.parse(line)
  if (!username || !password) throw new Error('Username and password are required on stdin.')
  const result = spawnSync(process.execPath, [resolve(__dirname, '../apps/cli/dist/index.js'), 'run', 'modules', '--env', process.env.AXTEST_TEST_WEB ?? 'http://localhost:5173', '--reporter', 'json'], {
    cwd: resolve(__dirname, 'self'), encoding: 'utf8', timeout: 180000,
    env: { ...process.env, AXTEST_USERNAME: username, AXTEST_PASSWORD: password, AXTEST_CASE: 'cli-' + Date.now() },
  })
  const redact = value => (value ?? '').replaceAll(password, '[redacted]')
  process.stdout.write(redact(result.stdout)); process.stderr.write(redact(result.stderr))
  process.exitCode = result.status ?? 1
})
