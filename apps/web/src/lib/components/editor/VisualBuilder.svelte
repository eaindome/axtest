<script lang="ts">
  import TestBlockCard from './TestBlockCard.svelte'
  import TestKindFilterBar from './TestKindFilterBar.svelte'
  import FileSetupPanel from './FileSetupPanel.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import { canGenerateFromSeed } from '$lib/editor/generate-tests'
  import { makeStep, serializeAxtest } from '$lib/editor/parse-axtest'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import { reorder } from '$lib/editor/step-options'
  import { matchesKindFilter, type TestKindFilter } from '$lib/editor/test-kind'
  import type { ParsedFile, Rule, Step, TestBlock } from '$lib/editor/types'

  type VisualPanel = 'setup' | 'tests'

  interface Props {
    draft?: boolean
    authOptions?: { value: string; label: string }[]
    parsed: ParsedFile
    selectedTestId: string | null
    collapsedTests: Set<string>
    runningTestId: string | null
    generatingTestId: string | null
    testStatuses: Record<string, 'passed' | 'failed'>
    kindFilter: TestKindFilter
    onKindFilterChange: (filter: TestKindFilter) => void
    onchange: (content: string, parsed: ParsedFile) => void
    onSelectTest: (testId: string) => void
    onToggleCollapse: (testId: string) => void
    onRunTest: (testId: string) => void
    onGenerateTests: (testId: string) => void | Promise<void>
  }

  let {
    draft = false,
    parsed,
    authOptions,
    selectedTestId,
    collapsedTests,
    runningTestId,
    generatingTestId,
    testStatuses,
    kindFilter,
    onKindFilterChange,
    onchange,
    onSelectTest,
    onToggleCollapse,
    onRunTest,
    onGenerateTests,
  }: Props = $props()

  let panel = $state<VisualPanel>('tests')
  let authoringScroll = $state<HTMLDivElement>()

  $effect(() => {
    if (selectedTestId) panel = 'tests'
  })

  function apply(patch: ParsedFile) {
    onchange(serializeAxtest(patch), patch)
  }

  function updateStep(testId: string, sec: 'steps' | 'asserts', stepId: string, patch: Partial<Step>) {
    apply({
      ...parsed,
      tests: parsed.tests.map(t =>
        t.id !== testId ? t : { ...t, [sec]: t[sec].map(s => s.id !== stepId ? s : { ...s, ...patch }) }
      ),
    })
  }

  function deleteStep(testId: string, sec: 'steps' | 'asserts', stepId: string) {
    apply({
      ...parsed,
      tests: parsed.tests.map(t =>
        t.id !== testId ? t : { ...t, [sec]: t[sec].filter(s => s.id !== stepId) }
      ),
    })
  }

  function addStep(testId: string, sec: 'steps' | 'asserts') {
    const ns = makeStep(sec === 'steps' ? 'click' : 'assert')
    apply({
      ...parsed,
      tests: parsed.tests.map(t =>
        t.id !== testId ? t : { ...t, [sec]: [...t[sec], ns] }
      ),
    })
  }

  function updateTest(testId: string, patch: Partial<TestBlock>) {
    let tests = parsed.tests.map(t => t.id !== testId ? t : { ...t, ...patch })
    if (patch.kind === 'seed') {
      tests = tests.map(t => t.id !== testId && t.kind === 'seed' ? { ...t, kind: '' } : t)
    }
    apply({ ...parsed, tests, ...(parsed.flow && patch.name !== undefined ? { [parsed.flow === 'auth' ? 'auth' : 'module']: patch.name } : {}) })
  }

  function deleteTest(testId: string) {
    const index = parsed.tests.findIndex(test => test.id === testId)
    const tests = parsed.tests.filter(t => t.id !== testId)
    apply({ ...parsed, tests })
    const next = tests[Math.min(index, tests.length - 1)]
    if (next) chooseTest(next.id)
  }

  function reorderSteps(testId: string, from: number, to: number) {
    apply({
      ...parsed,
      tests: parsed.tests.map(t =>
        t.id !== testId ? t : { ...t, steps: reorder(t.steps, from, to) }
      ),
    })
  }

  function addTest() {
    panel = 'tests'
    const nt: TestBlock = {
      id: crypto.randomUUID(),
      name: `New behaviour${parsed.tests.length ? ' ' + (parsed.tests.length + 1) : ''}`,
      kind: '',
      generatedFrom: '',
      dependsOn: '',
      steps: [],
      asserts: [],
    }
    onKindFilterChange('all')
    apply({ ...parsed, tests: [...parsed.tests, nt] })
    onSelectTest(nt.id)
  }

  function updateMeta(field: 'title' | 'baseUrl' | 'auth' | 'module', value: string) {
    apply({ ...parsed, [field]: value, ...(parsed.flow && field === (parsed.flow === 'auth' ? 'auth' : 'module') ? { tests: parsed.tests.map(test => ({ ...test, name: value })) } : {}) })
  }

  function updateRules(rules: Rule[]) {
    apply({ ...parsed, rules })
  }

  const visibleTests = $derived(
    parsed.tests
      .map((test, index) => ({ test, index }))
      .filter(({ test }) => parsed.flow || matchesKindFilter(test.kind, kindFilter))
  )

  const hasKindTags = $derived(parsed.tests.some(t => t.kind !== ''))
  const activeEntry = $derived(visibleTests.find(entry => entry.test.id === selectedTestId) ?? visibleTests[0])
  const activePosition = $derived(activeEntry ? visibleTests.indexOf(activeEntry) : -1)
  const activeId = $derived(activeEntry?.test.id)
  $effect(() => { if (activeId && authoringScroll) authoringScroll.scrollTop = 0 })
  function chooseTest(id: string) {
    if (collapsedTests.has(id)) onToggleCollapse(id)
    onSelectTest(id)
  }
  $effect(() => {
    if (activeEntry && activeEntry.test.id !== selectedTestId) chooseTest(activeEntry.test.id)
  })
  const panelOptions = $derived([
    { value: 'setup' as const, label: 'Suite settings' },
    {
      value: 'tests' as const,
      label: parsed.flow ? 'Flow steps' : 'Test cases',
      badge: parsed.tests.length > 0 ? parsed.tests.length : undefined,
    },
  ])
</script>

<div class="flex-1 flex flex-col min-h-0 bg-zinc-50/40 dark:bg-zinc-950">
  <!-- Panel switcher -->
  <header class="visual-subheader shrink-0 px-5 pt-3.5 pb-3.5 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm">
    <div class="max-w-2xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SegmentedControl
        value={panel}
        options={panelOptions}
        onchange={(v) => (panel = v as VisualPanel)}
        ariaLabel="Visual editor section"
      />

      <div class="flex items-center min-h-8 sm:justify-end">
        {#if panel === 'setup'}
          <p class="text-sm leading-snug text-zinc-400 dark:text-zinc-500">
            Suite details &amp; validation rules
          </p>
        {:else if hasKindTags}
          <div class="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span class="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">Filter</span>
            <TestKindFilterBar tests={parsed.tests} value={kindFilter} onchange={onKindFilterChange} compact />
          </div>
        {:else if parsed.tests.length > 0}
          <p class="text-sm text-zinc-400 dark:text-zinc-500">{parsed.flow ? 'Reusable flow' : `${parsed.tests.length} test${parsed.tests.length === 1 ? '' : 's'}`}</p>
        {/if}
      </div>
    </div>
  </header>

  {#if panel === 'tests' && !parsed.flow && parsed.tests.length}
    <nav aria-label="Behaviour navigation" class="shrink-0 border-b border-zinc-200/70 dark:border-zinc-800 px-5 py-3">
      <div class="max-w-2xl mx-auto space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <div class="min-w-0 flex-1 basis-48"><DropdownMenu class="w-full" label="Choose behaviour" searchable value={activeEntry?.test.id ?? ''} options={visibleTests.map(({ test, index }) => ({ value: test.id, label: `${index + 1}. ${test.name} · ${runningTestId === test.id ? 'Running' : testStatuses[test.id] ?? 'No result'}` }))} onchange={chooseTest} /></div>
          <button type="button" class="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 disabled:opacity-40" disabled={activePosition <= 0} onclick={() => chooseTest(visibleTests[activePosition - 1].test.id)}>Previous</button>
          <button type="button" class="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 disabled:opacity-40" disabled={activePosition < 0 || activePosition >= visibleTests.length - 1} onclick={() => chooseTest(visibleTests[activePosition + 1].test.id)}>Next</button>
          <button type="button" class="rounded-lg px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400" onclick={addTest}>Add behaviour</button>
        </div>
        <p class="text-xs text-zinc-500">{activePosition < 0 ? 0 : activePosition + 1} of {visibleTests.length}{kindFilter !== 'all' ? ' matching' : ''} behaviours · Results reflect the latest run in this editor.</p>
      </div>
    </nav>
  {/if}

  <div bind:this={authoringScroll} role="region" aria-label="Visual authoring canvas" class="flex-1 overflow-auto px-5 pt-5 pb-6 panel-scroll min-h-0">
    <div class="max-w-2xl mx-auto">
      {#if panel === 'setup'}
        <FileSetupPanel
          {draft}
          {parsed}
          {authOptions}
          onMetaChange={updateMeta}
          onRulesChange={updateRules}
        />
      {:else}
        <div class="space-y-4">
          {#if parsed.tests.length === 0}
            <div class="text-center py-16">
              <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-1">No test cases yet</p>
              <p class="text-xs text-zinc-400 mb-4">Add a behaviour, its actions and an expected result.</p>
              <button type="button" onclick={() => (panel = 'setup')} class="text-xs text-amber-600 hover:text-amber-700 mr-3">Suite settings</button>
              <button type="button" onclick={addTest} class="text-xs font-medium text-amber-600 hover:text-amber-700">+ Add test</button>
            </div>
          {:else if visibleTests.length === 0}
            <div class="text-center py-12 text-sm text-zinc-400">
              No tests match this filter.
              <button type="button" onclick={() => onKindFilterChange('all')} class="block mx-auto mt-2 text-xs text-amber-600 hover:text-amber-700">Show all</button>
            </div>
          {:else}
            {#if parsed.flow}
              <p class="text-sm text-zinc-500">{parsed.flow === 'auth' ? 'Authentication flow' : 'Reusable module flow'}. Its steps run when another spec references this flow.</p>
            {/if}
            {#each activeEntry ? [activeEntry] : [] as { test, index: ti } (test.id)}
              <TestBlockCard
                flow={!!parsed.flow}
                {test}
                index={ti}
                allTests={parsed.tests}
                selected={selectedTestId === test.id}
                collapsed={collapsedTests.has(test.id)}
                running={runningTestId === test.id}
                generating={generatingTestId === test.id}
                runStatus={testStatuses[test.id] ?? null}
                canGenerate={test.kind === 'seed' && testStatuses[test.id] === 'passed' && canGenerateFromSeed(test, parsed.rules, parsed.tests)}
                onSelect={() => onSelectTest(test.id)}
                onToggleCollapse={() => onToggleCollapse(test.id)}
                onUpdate={(patch) => updateTest(test.id, patch)}
                onDelete={() => deleteTest(test.id)}
                onRun={() => onRunTest(test.id)}
                onGenerate={() => onGenerateTests(test.id)}
                onUpdateStep={(sec, stepId, patch) => updateStep(test.id, sec, stepId, patch)}
                onDeleteStep={(sec, stepId) => deleteStep(test.id, sec, stepId)}
                onAddStep={(sec) => addStep(test.id, sec)}
                onReorderSteps={(from, to) => reorderSteps(test.id, from, to)}
              />
            {/each}
          {/if}


        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .panel-scroll::-webkit-scrollbar { width: 6px; }
  .panel-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }
  :global(.dark) .panel-scroll { scrollbar-color: rgb(63 63 70 / 0.5) transparent; }
  :global(.dark) .panel-scroll::-webkit-scrollbar-thumb { background: rgb(63 63 70 / 0.5); }
</style>
