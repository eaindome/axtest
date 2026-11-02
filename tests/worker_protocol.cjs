const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')
const assert = require('node:assert/strict')
const worker = resolve(__dirname, '../packages/core/dist/worker.js')
function invoke(input) {
  const result = spawnSync(process.execPath, [worker], { input: JSON.stringify(input), encoding: 'utf8', timeout: 15000 })
  if (result.error) throw result.error
  return JSON.parse(result.stdout)
}
const source = '---\ntitle: Example\n---\nRULES\n field "Email" is required\nTEST "Seed"\n TAG seed\n STEPS\n type "valid@example.test" in "Email"\n ASSERT\n assert "Saved" is_visible'
const generated = invoke({ command: 'generate', content: source, seedTestId: 'editor-transient-id' })
const accountInputs = invoke({ command: 'validate', content: 'AUTH self-login\nTEST "Account test"\n STEPS\n type "{{AXTEST_CASE}}" in "Name"\n ASSERT\n assert "Ready" is_visible', files: [{path:'auth/self-login.axtest', content:'AUTH self-login\nSTEPS\n type "{{AXTEST_USERNAME}}" in "Username"\n type "{{AXTEST_PASSWORD}}" in "Password"\nASSERT\n assert "Dashboard" is_visible'}] })
assert.equal(accountInputs.ok,true)
assert.deepEqual(accountInputs.result.requiredVariables,['AXTEST_CASE','AXTEST_PASSWORD','AXTEST_USERNAME'])
const upload = 'TEST "Upload"\n STEPS\n upload "C:/host-secret.txt" to "File"\n ASSERT\n assert "Uploaded" is_visible'
assert.match(invoke({ command: 'validate', content: upload }).error, /managed assets/)
const secret = 'redaction-check-"quoted-value'
const redacted = invoke({ command: 'validate', content: `TEST "Redaction"\n STEPS\n ${secret}\n ASSERT\n assert "Visible" is_visible`, variables: { AXTEST_PASSWORD: secret } })
assert.equal(redacted.error.includes(secret), false)
assert.match(redacted.error, /\[redacted\]/)
assert.equal(generated.ok, true)
assert(generated.result.generatedCount > 0)
assert.match(generated.result.content, /ID editor-transient-id/)
assert.match(generated.result.content, /type "" in "Email"/)
assert.equal(invoke({ command: 'validate', content: generated.result.content }).ok, true)
const again = invoke({ command: 'generate', content: generated.result.content, seedTestId: 'editor-transient-id' })
assert.equal(again.result.generatedCount, 0)
const cyclic = 'TEST "A"\n ID a\n DEPENDS ON b\n ASSERT\n assert "A" is_visible\nTEST "B"\n ID b\n DEPENDS ON a\n ASSERT\n assert "B" is_visible'
assert.match(invoke({ command: 'validate', content: cyclic }).error, /Circular/)
const missing = 'TEST "A"\n ID a\n DEPENDS ON missing\n ASSERT\n assert "A" is_visible'
assert.match(invoke({ command: 'validate', content: missing }).error, /Missing dependency/)
assert.equal(invoke({ command: 'validate', content: 'TEST "A"\n ASSERT\n assert "A" is_visible', testNames: ['Unknown'] }).ok, false)
console.log('PASS worker JSON protocol, transient editor IDs, valid generated specs, idempotence, and dependency rejection')
