<script lang="ts">
  import { onMount } from 'svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import { makeStep, serializeAxtest, parseAxtest } from '$lib/editor/parse-axtest'
  import { parseAssertion, serializeAssertion } from '$lib/editor/parse-assertion'
  import type { Step, StepType, TestBlock } from '$lib/editor/types'
  import type { TestFile } from '$lib/api/types'
  import { testSources } from '$lib/suites'
  let { file, test = null, onsave, onclose }: { file: TestFile; test?: TestBlock | null; onsave: (content: string, name: string) => Promise<void>; onclose: () => void } = $props()
  let name = $state(''), id = $state(''), dependency = $state(''), steps = $state<Step[]>([]), checks = $state<{ id: string; type: string; target: string; value: string }[]>([])
  let saving = $state(false), error = $state(''), touched = $state(false)
  const actionOptions = [{ value: 'navigate', label: 'Open a page' }, { value: 'click', label: 'Click a control' }, { value: 'type', label: 'Enter text' }, { value: 'select', label: 'Choose an option' }, { value: 'clear', label: 'Clear a field' }, { value: 'wait', label: 'Wait for an element' }]
  const checkOptions = [{ value: 'is_visible', label: 'Text or element appears' }, { value: 'is_not_visible', label: 'Text or element is hidden' }, { value: 'contains', label: 'Element contains text' }, { value: 'url_contains', label: 'URL contains a path' }, { value: 'is_enabled', label: 'Control is enabled' }, { value: 'is_disabled', label: 'Control is disabled' }]
  const dependencies = $derived(parseAxtest(file.content).tests.filter(item => item.name !== test?.name && file.content.includes(`ID ${item.id}`)))
  onMount(() => { name = test?.name ?? ''; id = test?.id ?? crypto.randomUUID(); dependency = test?.dependsOn ?? ''; steps = test ? test.steps.map(step => ({ ...step, target: step.type === 'navigate' ? step.target.replace(/^"|"$/g, '') : step.target })) : [{ ...makeStep('navigate'), target: '/' }]; checks = test ? test.asserts.map(step => ({ id: step.id, ...parseAssertion(step.assertion) })) : [{ id: crypto.randomUUID(), type: 'is_visible', target: '', value: '' }] })
  function close() { if (!saving && (!touched || confirm("Discard this test's unsaved changes?"))) onclose() }
  function move(index: number, direction: number) { const result = [...steps]; [result[index], result[index + direction]] = [result[index + direction], result[index]]; steps = result; touched = true }
  async function save() {
    error = ''
    if (!name.trim() || /["\r\n]/.test(name) || name.length > 120) { error = 'Use a short, single-line behaviour name without double quotes.'; return }
    if (parseAxtest(file.content).tests.some(item => item.name === name.trim() && item.name !== test?.name)) { error = 'A test with this name already exists in this suite.'; return }
    if (!steps.length || steps.some(step => !step.target.trim() || (['type', 'select'].includes(step.type) && !step.value.trim()))) { error = 'Complete each action before saving.'; return }
    if (!checks.length || checks.some(check => check.type === 'url_contains' ? !check.value.trim() : !check.target.trim() || (check.type === 'contains' && !check.value.trim()))) { error = 'Add at least one complete expected result. Actions alone cannot prove the behaviour works.'; return }
    if ([...steps.flatMap(step => [step.target, step.value, step.context]), ...checks.flatMap(check => [check.target, check.value])].some(value => /[\r\n]/.test(value))) { error = 'Use a single line for each action and expected result.'; return }
    const block: TestBlock = { id, name: name.trim(), kind: test?.kind ?? '', generatedFrom: test?.generatedFrom ?? '', dependsOn: dependency, steps: steps.map(step => step.type === 'navigate' ? { ...step, target: `"${step.target}"` } : step), asserts: checks.map(check => ({ ...makeStep('assert'), id: check.id, assertion: serializeAssertion(check as Parameters<typeof serializeAssertion>[0]) })) }
    const serialized = serializeAxtest({ title: '', baseUrl: '', auth: '', rules: [], tests: [block] }); const source = serialized.slice(serialized.indexOf('TEST ')) + '\n'
    const parts = testSources(file), index = parseAxtest(file.content).tests.findIndex(item => item.name === test?.name)
    const content = test && index >= 0 ? file.content.slice(0, parts.blocks[index].start) + source + file.content.slice(parts.blocks[index].end) : file.content.trimEnd() + '\n\n' + source
    saving = true
    try { await onsave(content, block.name); touched = false; onclose() }
    catch (reason) { error = reason instanceof Error ? reason.message : 'Could not save the test. Your changes are still here.' }
    finally { saving = false }
  }
</script>

<SlidePanel open={true} title={test ? 'Edit behaviour test' : 'Add behaviour test'} onclose={close} dismissible={!saving}>
  <form class="p-5 space-y-6" onsubmit={event => { event.preventDefault(); save() }} oninput={() => { touched = true }}>
    <p class="text-sm text-zinc-500">Describe what a user does and the result that proves it worked.</p>
    {#if error}<p class="error-banner" role="alert">{error}</p>{/if}
    <Input label="Behaviour name" bind:value={name} placeholder="A user can complete a task" required disabled={saving} />
    <section class="space-y-3" aria-label="Behaviour actions"><div class="flex items-center justify-between"><h3 class="section-heading">Actions</h3><button type="button" class="text-xs font-medium text-amber-700 dark:text-amber-400" disabled={saving} onclick={() => { steps = [...steps, makeStep('click')]; touched = true }}>Add action</button></div>
      {#each steps as step, index}<div class="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3"><div class="flex items-center justify-between"><span class="text-xs text-zinc-500">Action {index + 1}</span><div class="flex gap-2"><button type="button" class="text-xs text-zinc-500" aria-label={`Move action ${index + 1} earlier`} disabled={saving || index === 0} onclick={() => move(index, -1)}>Earlier</button><button type="button" class="text-xs text-zinc-500" aria-label={`Move action ${index + 1} later`} disabled={saving || index === steps.length - 1} onclick={() => move(index, 1)}>Later</button><button type="button" class="text-xs text-red-600" aria-label={`Remove action ${index + 1}`} disabled={saving} onclick={() => { steps = steps.filter(item => item.id !== step.id); touched = true }}>Remove</button></div></div>
        <DropdownMenu class="w-full" label={`Action ${index + 1} type`} value={step.type} options={actionOptions} disabled={saving} onchange={value => { step.type = value as StepType; touched = true }} />
        <Input label={step.type === 'navigate' ? `Page path for action ${index + 1}` : `Target for action ${index + 1}`} bind:value={step.target} placeholder={step.type === 'navigate' ? '/tasks' : 'Visible text, field label, or control name'} required disabled={saving} />
        {#if step.type === 'type' || step.type === 'select'}<Input label={`Value for action ${index + 1}`} bind:value={step.value} required disabled={saving} />{/if}
        {#if step.type === 'wait'}<DropdownMenu label={`Wait condition for action ${index + 1}`} value={step.value || 'appear'} options={[{ value: 'appear', label: 'Appears' }, { value: 'disappear', label: 'Disappears' }]} disabled={saving} onchange={value => { step.value = value; touched = true }} />{/if}
      </div>{/each}<p class="text-xs text-zinc-500">Action values are saved in the test. Reuse the suite's login flow for credentials.</p>
    </section>
    <section class="space-y-3" aria-label="Expected results"><div class="flex items-center justify-between"><h3 class="section-heading">Expected results</h3><button type="button" class="text-xs font-medium text-amber-700 dark:text-amber-400" disabled={saving} onclick={() => { checks = [...checks, { id: crypto.randomUUID(), type: 'is_visible', target: '', value: '' }]; touched = true }}>Add expected result</button></div>
      {#each checks as check, index}<div class="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3"><div class="flex items-center justify-between"><span class="text-xs text-zinc-500">Check {index + 1}</span><button type="button" class="text-xs text-red-600" aria-label={`Remove expected result ${index + 1}`} disabled={saving} onclick={() => { checks = checks.filter(item => item.id !== check.id); touched = true }}>Remove</button></div>
        <DropdownMenu class="w-full" label={`Expected result ${index + 1} type`} value={check.type} options={checkOptions} disabled={saving} onchange={value => { check.type = value; touched = true }} />
        {#if check.type !== 'url_contains'}<Input label={`Expected target ${index + 1}`} bind:value={check.target} placeholder="Buy milk" required disabled={saving} />{/if}
        {#if ['contains', 'url_contains'].includes(check.type)}<Input label={`Expected value ${index + 1}`} bind:value={check.value} placeholder={check.type === 'url_contains' ? '/tasks' : 'Expected text'} required disabled={saving} />{/if}
      </div>{/each}
    </section>
    {#if dependencies.length}<div class="space-y-2"><p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Run after another test (optional)</p><DropdownMenu class="w-full" label="Test prerequisite" value={dependency} options={[{ value: '', label: 'No prerequisite' }, ...dependencies.map(item => ({ value: item.id, label: item.name }))]} disabled={saving} onchange={value => { dependency = value; touched = true }} /></div>{/if}
    <div class="flex gap-2"><Button type="submit" loading={saving}>Save test</Button><Button variant="secondary" disabled={saving} onclick={close}>Cancel</Button></div>
  </form>
</SlidePanel>
