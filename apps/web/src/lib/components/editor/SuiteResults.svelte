<script lang="ts">
  import type { RunDetail, TestFile } from '$lib/api/types'
  import { suiteLabel } from '$lib/suites'
  import type { ResultsView } from '$lib/run-preferences'
  import Button from '$lib/components/ui/Button.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import RunEvidence from './RunEvidence.svelte'
  let { runs, files, busy, context, view, onview, onedit, onrerun, archived, historyHref }: {
    runs: RunDetail[]; files: TestFile[]; busy: boolean; context: { environment: string; account: string; url: string; mode: string; slowMoMs?: number } | null
    view: ResultsView; onview: (value: ResultsView) => void; onedit: (file: TestFile, name: string) => void; onrerun: () => void; archived: boolean; historyHref: string
  } = $props()
  let list = $state<HTMLDivElement>()
  const pageSize = 10
  const passed = $derived(runs.reduce((sum, run) => sum + run.passedTests, 0))
  const failed = $derived(runs.reduce((sum, run) => sum + run.failedTests, 0))
  const total = $derived(runs.reduce((sum, run) => sum + run.totalTests, 0))
  const rows = $derived(runs.flatMap(run => {
    const file = files.find(file => file.path === run.suiteName), label = file ? suiteLabel(file) : run.suiteName ?? 'Suite'
    return run.results.map(result => ({ run, result, file, label }))
  }))
  const filtered = $derived(rows.filter(row => (view.status === 'all' || row.result.status === view.status) && `${row.label} ${row.result.testName}`.toLowerCase().includes(view.query.trim().toLowerCase())))
  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)))
  const currentPage = $derived(Math.min(view.page, pageCount))
  const start = $derived((currentPage - 1) * pageSize)
  const visible = $derived(filtered.slice(start, start + pageSize))
  const waiting = $derived(runs.filter(run => run.status === 'pending' || run.status === 'running'))
  function update(patch: Partial<ResultsView>) { onview({ ...view, ...patch }); if (list) list.scrollTop = 0 }
</script>

<section class="surface overflow-hidden" aria-label="Suite results">
  <div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
    <div><h2 class="section-heading">Results{#if runs.length}<span class="ml-2 text-sm font-normal" role="status">{passed}/{total} passed{busy ? ' · Running…' : ''}</span>{/if}</h2>{#if context}<p class="text-xs text-zinc-500 mt-1">Latest batch · {context.environment} · {context.account} · {context.mode === 'visible' || context.mode === 'watch' ? `Visible browser · ${context.slowMoMs ?? 400} ms delay` : 'Headless'}</p>{/if}</div>
    {#if failed && !busy && !archived}<Button variant="secondary" size="sm" onclick={onrerun}>Rerun failed</Button>{/if}
  </div>
  {#if !runs.length}<p class="text-sm text-zinc-500 p-6">Select tests and run them. Results and failure evidence will appear here.</p>
  {:else}
    <div class="p-4 space-y-3 border-b border-zinc-100 dark:border-zinc-800">
      <p class="text-xs text-zinc-500">Results belong to the last submitted batch, including prerequisites. Changing your selection does not change this list.</p>
      <div class="flex flex-wrap gap-3"><input aria-label="Search results" type="search" placeholder="Find a test or suite" value={view.query} oninput={event => update({ query: event.currentTarget.value, page: 1 })} class="min-w-0 flex-1 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-400/40" /><DropdownMenu label="Result status" value={view.status} options={[{ value: 'all', label: 'All results' }, { value: 'failed', label: 'Failed' }, { value: 'passed', label: 'Passed' }, { value: 'skipped', label: 'Skipped' }]} onchange={status => update({ status, page: 1 })} /></div>
    </div>
    {#if waiting.length}<div class="px-5 py-3 text-xs text-zinc-500" role="status">{waiting.length} suite{waiting.length === 1 ? '' : 's'} queued or running. Completed test results appear here as runs finish.</div>{/if}
    {#each runs.filter(run => run.errorMessage) as run}<p class="error-banner m-4" role="alert">{run.suiteName}: {run.errorMessage}</p>{/each}
    <div bind:this={list} class="max-h-[32rem] overflow-y-auto" aria-label="Results on this page">
      {#each visible as row (`${row.run.id}:${row.result.id}`)}
        <details class="border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 p-4" open={row.result.status === 'failed'}>
          <summary class="cursor-pointer text-sm text-zinc-800 dark:text-zinc-200"><span class="font-medium break-words">{row.result.testName}</span><span class="ml-2 text-xs {row.result.status === 'failed' ? 'text-red-600 dark:text-red-400' : row.result.status === 'passed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}">{row.result.status} · {row.result.durationMs}ms</span><span class="block mt-1 text-xs text-zinc-500 break-words">{row.label}</span></summary>
          {#if row.result.errorMessage}<p class="mt-3 text-sm text-red-600 break-words">{row.result.errorMessage}</p>{/if}
          <RunEvidence result={row.result} />
          {#if !archived && row.file}<button class="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400" onclick={() => onedit(row.file!, row.result.testName)}>Edit this test</button>{/if}
        </details>
      {:else}<p class="p-6 text-sm text-zinc-500">{waiting.length && !rows.length ? 'Waiting for the runner to return results.' : !rows.length ? 'This batch has no test results. Review any run errors above.' : 'No results match this search and status.'}</p>{#if rows.length && (view.query || view.status !== 'all')}<button class="px-6 pb-4 text-xs font-medium text-amber-700 dark:text-amber-400" onclick={() => update({ query: '', status: 'all', page: 1 })}>Clear result filters</button>{/if}{/each}
    </div>
    <nav aria-label="Result pagination" class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500"><span>{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} results` : '0 results'}{view.query || view.status !== 'all' ? ` · ${rows.length} in batch` : ''}</span><div class="flex items-center gap-3"><button disabled={currentPage === 1} class="disabled:opacity-40" onclick={() => update({ page: currentPage - 1 })}>Previous</button><span>Page {currentPage} of {pageCount}</span><button disabled={currentPage === pageCount} class="disabled:opacity-40" onclick={() => update({ page: currentPage + 1 })}>Next</button></div></nav>
    <div class="p-4 border-t border-zinc-100 dark:border-zinc-800"><a class="text-xs text-amber-700 dark:text-amber-400 font-medium" href={historyHref}>Open project run history</a></div>
  {/if}
</section>
