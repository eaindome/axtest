<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import TestKindFilterBar from './TestKindFilterBar.svelte'
  import type { ParsedFile } from '$lib/editor/types'
  import type { RunDetail, ResultItem } from '$lib/api'
  import { TEST_KIND_LABELS, TEST_KIND_STYLES, matchesKindFilter, type TestKindFilter } from '$lib/editor/test-kind'

  interface Props {
    parsed: ParsedFile | null
    runResult: RunDetail | null
    running: boolean
    selectedTestId: string | null
    collapsedTests?: Set<string>
    kindFilter: TestKindFilter
    onKindFilterChange: (filter: TestKindFilter) => void
    width: number
    onSelectTest: (testId: string) => void
    onToggleCollapse?: (testId: string) => void
  }

  let {
    parsed,
    runResult,
    running,
    selectedTestId,
    collapsedTests = new Set(),
    kindFilter,
    onKindFilterChange,
    width,
    onSelectTest,
    onToggleCollapse,
  }: Props = $props()

  const visibleTests = $derived(
    parsed?.tests.filter(t => matchesKindFilter(t.kind, kindFilter)) ?? []
  )

  const hasKindTags = $derived(parsed?.tests.some(t => t.kind !== '') ?? false)

  function testStatus(testName: string): ResultItem | undefined {
    return runResult?.results.find(r => r.testName === testName)
  }

  function fmt(ms: number) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }
</script>

<aside
  class="shrink-0 flex flex-col border-l border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden"
  style="width: {width}px"
>
  <div class="px-3 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 space-y-2">
    <p class="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Outline</p>
    {#if hasKindTags && parsed}
      <TestKindFilterBar tests={parsed.tests} value={kindFilter} onchange={onKindFilterChange} compact />
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto panel-scroll">
    {#if !parsed || parsed.tests.length === 0}
      <p class="px-3 py-6 text-xs text-zinc-400 text-center">No tests in file</p>
    {:else if visibleTests.length === 0}
      <p class="px-3 py-6 text-xs text-zinc-400 text-center">No tests match filter</p>
    {:else}
      <div class="py-1 px-1 space-y-0.5">
        {#if parsed.title}
          <p class="px-2.5 py-1 text-xs text-zinc-400 truncate" title={parsed.title}>{parsed.title}</p>
        {/if}
        {#each visibleTests as test}
          {@const i = parsed.tests.findIndex(t => t.id === test.id)}
          {@const result = testStatus(test.name)}
          {@const collapsed = collapsedTests.has(test.id)}
          <div class="flex items-start gap-0.5 rounded-md {selectedTestId === test.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}">
            {#if onToggleCollapse}
              <button
                type="button"
                onclick={() => onToggleCollapse(test.id)}
                aria-label={collapsed ? 'Expand' : 'Collapse'}
                class="size-6 shrink-0 flex items-center justify-center text-zinc-400 hover:text-zinc-600 mt-1"
              >
                <svg class="size-3 transition-transform {collapsed ? '' : 'rotate-90'}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            {/if}
            <button
              onclick={() => onSelectTest(test.id)}
              class="flex-1 flex items-start gap-2 px-1.5 py-2 text-left transition-colors min-w-0"
            >
              <span class="text-xs font-mono text-zinc-400 mt-0.5 shrink-0 w-4">{i + 1}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  {#if test.kind}
                    <span class="text-[8px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded {TEST_KIND_STYLES[test.kind]}">
                      {TEST_KIND_LABELS[test.kind]}
                    </span>
                  {/if}
                  <p class="text-xs leading-snug line-clamp-2 {collapsed ? 'text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}">{test.name}</p>
                </div>
                <p class="text-xs text-zinc-400 mt-0.5">{test.steps.length} steps · {test.asserts.length} asserts</p>
              </div>
              {#if result}
                <span class="size-2 rounded-full shrink-0 mt-1 {result.status === 'passed' ? 'bg-emerald-500' : 'bg-red-500'}"></span>
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Last run summary -->
  <div class="border-t border-zinc-200/80 dark:border-zinc-800 shrink-0">
    <div class="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
      <p class="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Last Run</p>
    </div>
    <div class="px-3 py-3">
      {#if running}
        <p class="text-xs text-zinc-400">Running…</p>
      {:else if runResult}
        <div class="space-y-2">
          <Badge variant={runResult.status === 'passed' ? 'pass' : 'fail'}>
            {runResult.passedTests}/{runResult.totalTests} passed
          </Badge>
          <p class="text-xs text-zinc-400">{fmt(runResult.durationMs)} · {runResult.environment}</p>
          {#if runResult.failedTests > 0}
            <div class="space-y-1 mt-2">
              {#each runResult.results.filter(r => r.status === 'failed').slice(0, 3) as r}
                <p class="text-xs text-red-600 dark:text-red-400 truncate" title={r.testName}>{r.testName}</p>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-xs text-zinc-400">No runs yet</p>
      {/if}
    </div>
  </div>
</aside>

<style>
  .panel-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .panel-scroll::-webkit-scrollbar { width: 4px; }
  .panel-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }
  :global(.dark) .panel-scroll { scrollbar-color: rgb(63 63 70 / 0.5) transparent; }
  :global(.dark) .panel-scroll::-webkit-scrollbar-thumb { background: rgb(63 63 70 / 0.5); }
</style>
