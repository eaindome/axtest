<script lang="ts">
  import TestBlockCard from './TestBlockCard.svelte'
  import { canGenerateFromSeed } from '$lib/editor/generate-tests'
  import { makeStep, serializeAxtest } from '$lib/editor/parse-axtest'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import { reorder } from '$lib/editor/step-options'
  import { TEST_KIND_FILTER_OPTIONS, matchesKindFilter, type TestKindFilter } from '$lib/editor/test-kind'
  import type { Snippet } from 'svelte'
  import type { ParsedFile, Step, TestBlock } from '$lib/editor/types'


  interface Props {
    controls?: Snippet
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
    controls,
    parsed,
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

  let authoringScroll = $state<HTMLDivElement>()

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
</script>

<div class="flex-1 flex flex-col min-h-0 bg-zinc-50/40 dark:bg-zinc-950">
  <div class="shrink-0 border-b border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2">
    <div class="flex flex-wrap items-center gap-2">
      {@render controls?.()}
      {#if !parsed.flow && parsed.tests.length}
        <nav aria-label="Behaviour navigation" class="min-w-0 flex flex-1 flex-wrap items-center gap-2">
          <div class="min-w-0 flex-1 basis-48"><DropdownMenu class="w-full" label="Choose behaviour" searchable value={activeEntry?.test.id ?? ''} options={visibleTests.map(({ test, index }) => ({ value: test.id, label: `${index + 1}. ${test.name} · ${runningTestId === test.id ? 'Running' : testStatuses[test.id] ?? 'No result'}` }))} onchange={chooseTest} /></div>
          {#if hasKindTags}<DropdownMenu label="Behaviour type filter" value={kindFilter} options={TEST_KIND_FILTER_OPTIONS} onchange={value => onKindFilterChange(value as TestKindFilter)} />{/if}
          <span class="text-xs text-zinc-400" title="Position in matching behaviours">{activePosition < 0 ? 0 : activePosition + 1}/{visibleTests.length}</span>
          <button type="button" class="rounded-lg px-2 py-2 text-xs text-zinc-600 dark:text-zinc-300 disabled:opacity-40" disabled={activePosition <= 0} onclick={() => chooseTest(visibleTests[activePosition - 1].test.id)}>Previous</button>
          <button type="button" class="rounded-lg px-2 py-2 text-xs text-zinc-600 dark:text-zinc-300 disabled:opacity-40" disabled={activePosition < 0 || activePosition >= visibleTests.length - 1} onclick={() => chooseTest(visibleTests[activePosition + 1].test.id)}>Next</button>
          <button type="button" class="rounded-lg px-2 py-2 text-xs font-medium text-amber-700 dark:text-amber-400" onclick={addTest}>Add behaviour</button>
        </nav>
      {/if}
    </div>
  </div>

  <div bind:this={authoringScroll} role="region" aria-label="Visual authoring canvas" class="flex-1 overflow-auto px-5 pt-5 pb-6 panel-scroll min-h-0">
    <div class="max-w-2xl mx-auto">
        <div class="space-y-4">
          {#if parsed.tests.length === 0}
            <div class="text-center py-16">
              <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-1">No test cases yet</p>
              <p class="text-xs text-zinc-400 mb-4">Add a behaviour, its actions and an expected result.</p>
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
