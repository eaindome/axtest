<script lang="ts">
  import { untrack, onDestroy } from 'svelte'
  import ProjectNavigation from '$lib/components/layout/ProjectNavigation.svelte'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import RunEvidence from '$lib/components/editor/RunEvidence.svelte'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import type { Project, RunListItem, RunDetail } from '$lib/api'

  const projectId = $derived(Number($page.params.id))

  let project      = $state<Project | null>(null)
  let runs         = $state<RunListItem[]>([])
  let selectedRun  = $state<RunDetail | null>(null)
  let loading      = $state(true)
  let loadingRun   = $state(false)
  let error = $state('')
  let query = $state(''), status = $state('all'), environment = $state('all'), currentPage = $state(1)
  let detailOpen = $state(false), detailError = $state(''), selectedId = $state<number | null>(null), refreshing = $state(false)
  const pageSize = 10
  const sorted = $derived([...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id - a.id))
  const filtered = $derived(sorted.filter(run => (status === 'all' || run.status === status) && (environment === 'all' || run.environment === environment) && `${run.suiteName ?? 'Manual run'} #${run.id}`.toLowerCase().includes(query.trim().toLowerCase())))
  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)))
  const visiblePage = $derived(Math.min(currentPage, pageCount))
  const start = $derived((visiblePage - 1) * pageSize)
  const visibleRuns = $derived(filtered.slice(start, start + pageSize))
  const failedCount = $derived(runs.filter(run => run.status === 'failed').length)
  const activeCount = $derived(runs.filter(run => run.status === 'running' || run.status === 'pending').length)
  function closeDetail() { detailOpen = false; detailVersion++; loadingRun = false }
  onDestroy(() => { loadVersion++; detailVersion++ })

  $effect(() => {
    const ws = $currentWorkspace
    const id = projectId
    if (ws && id) untrack(() => void load(ws.id, id))
  })

  let loadVersion = 0
  let detailVersion = 0
  $effect(() => {
    const workspaceId = $currentWorkspace?.id
    const id = projectId
    if (!workspaceId || !runs.some(r => r.status === 'pending' || r.status === 'running')) return
    const timer = setTimeout(() => void load(workspaceId, id, true), 1500)
    return () => clearTimeout(timer)
  })
  async function load(workspaceId: number, id: number, refresh = false) {
    const version = ++loadVersion
    if (!refresh) { loading = true; project = null; selectedRun = null; runs = []; detailVersion++; detailOpen = false; selectedId = null; query = ''; status = 'all'; environment = 'all'; currentPage = 1 }
    else refreshing = true
    error = ''
    try {
      const [projs, runList] = await Promise.all([api().getProjects(workspaceId), api().getRuns(id)])
      if (version !== loadVersion) return
      project = projs.find(p => p.id === id) ?? null
      runs = runList
      if (refresh && selectedRun && (selectedRun.status === 'pending' || selectedRun.status === 'running')) {
        const selectedId = selectedRun.id
        const updated = await api().getRun(id, selectedId)
        if (version === loadVersion && selectedRun?.id === selectedId) selectedRun = updated
      }
    } catch { if (version === loadVersion) error = 'We couldn’t load this project’s run history. Please try again.' }
    finally { if (version === loadVersion) { loading = false; refreshing = false } }
  }
  async function selectRun(run: RunListItem) {
    const version = ++detailVersion
    selectedId = run.id; selectedRun = null; detailOpen = true
    loadingRun = true
    detailError = ''
    const id = projectId
    try {
      const detail = await api().getRun(id, run.id)
      if (version === detailVersion && id === projectId) selectedRun = detail
    } catch { if (version === detailVersion) detailError = 'We couldn’t load the selected run. Please try again.' }
    finally { if (version === detailVersion) loadingRun = false }
  }

  function fmt(ms: number) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function statusVariant(s: string): 'pass' | 'fail' | 'pending' | 'running' {
    return ({ passed: 'pass', failed: 'fail', pending: 'pending', running: 'running' } as const)[s] ?? 'pending'
  }

  $effect(() => {
    pageTitle.set(project?.name ?? 'Project')
    pageSubtitle.set(project?.baseUrl ?? '')
    pageAction.set(null)
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })
</script>

<div class="flex-1 min-h-0 overflow-auto bg-zinc-50/80 dark:bg-zinc-950">
  <div class="page-shell space-y-6">
    <ProjectNavigation {projectId} name={project?.name} active="history" />
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div><p class="eyebrow mb-2">Execution records</p><h1 class="page-heading">Run history</h1><p class="page-description">Find past runs, investigate failures, and review the evidence.</p></div>
      <div class="flex gap-2"><Button variant="secondary" disabled={loading || refreshing} onclick={() => $currentWorkspace && load($currentWorkspace.id, projectId, true)}>Refresh</Button><a class="action-link primary" href={`/projects/${projectId}/suites`}>Open test suites</a></div>
    </div>
    {#if error}<div class="error-banner" role="alert">{error}<button class="ml-3 underline" onclick={() => $currentWorkspace && load($currentWorkspace.id, projectId, true)}>Try again</button></div>{/if}
    {#if loading}<div class="surface p-10 flex items-center gap-3 text-sm text-zinc-500" role="status"><Spinner />Loading run history…</div>
    {:else if !project && !error}<p class="surface p-8 text-sm text-zinc-500">This project is not available in the current workspace.</p>
    {:else}
      <section class="surface overflow-hidden" aria-label="Run history">
        <div class="flex flex-wrap gap-x-8 gap-y-3 border-b border-zinc-100 px-5 py-4 text-sm dark:border-zinc-800">
          <p><span class="font-semibold text-zinc-900 dark:text-zinc-100">{runs.length}</span> <span class="text-zinc-500">total runs</span></p>
          <p><span class="font-semibold text-zinc-900 dark:text-zinc-100">{failedCount}</span> <span class="text-zinc-500">failed runs</span></p>
          <p><span class="font-semibold text-zinc-900 dark:text-zinc-100">{activeCount}</span> <span class="text-zinc-500">in progress</span></p>
          <p class="text-xs text-zinc-500 sm:ml-auto self-center">Newest first · Each entry is one suite execution</p>
        </div>
        {#if runs.length}
          <div class="flex flex-wrap items-center gap-3 p-4">
            <input type="search" aria-label="Search runs" placeholder="Search suite or run number" value={query} oninput={event => { query = event.currentTarget.value; currentPage = 1 }} class="h-10 min-w-0 w-full sm:flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            <DropdownMenu label="Run status" value={status} options={[{ value: 'all', label: 'All statuses' }, { value: 'failed', label: 'Failed' }, { value: 'passed', label: 'Passed' }, { value: 'running', label: 'Running' }, { value: 'pending', label: 'Pending' }]} onchange={value => { status = value; currentPage = 1 }} />
            <DropdownMenu label="Run environment" value={environment} options={[{ value: 'all', label: 'All environments' }, { value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }, { value: 'local', label: 'Local' }]} onchange={value => { environment = value; currentPage = 1 }} />
            {#if query || status !== 'all' || environment !== 'all'}<button class="text-xs font-medium text-zinc-500" onclick={() => { query = ''; status = 'all'; environment = 'all'; currentPage = 1 }}>Clear filters</button>{/if}
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm" aria-label="Past runs">
              <thead class="border-y border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"><tr><th class="px-5 py-3 font-medium">Suite / Run</th><th class="px-4 py-3 font-medium">Status</th><th class="px-4 py-3 font-medium">Results</th><th class="px-4 py-3 font-medium">Environment</th><th class="px-4 py-3 font-medium">Duration</th><th class="px-5 py-3 font-medium">Started</th></tr></thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                {#each visibleRuns as run (run.id)}
                  <tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
                    <td class="px-5 py-4"><button class="block max-w-[22rem] text-left font-medium text-zinc-800 hover:text-amber-700 dark:text-zinc-200 dark:hover:text-amber-400" onclick={() => selectRun(run)}><span class="block truncate max-w-[22rem]" title={run.suiteName ?? 'Manual run'}>{run.suiteName ?? 'Manual run'}</span><span class="mt-1 block text-xs font-normal text-zinc-500">Run #{run.id}</span></button></td>
                    <td class="px-4 py-4"><Badge variant={statusVariant(run.status)}>{run.status}</Badge></td>
                    <td class="px-4 py-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{run.passedTests}/{run.totalTests} passed{#if run.failedTests}<span class="block text-xs text-red-600 dark:text-red-400 mt-1">{run.failedTests} failed</span>{/if}</td>
                    <td class="px-4 py-4 text-zinc-500 capitalize">{run.environment}</td><td class="px-4 py-4 text-zinc-500 tabular-nums">{run.status === 'pending' ? '—' : fmt(run.durationMs)}</td><td class="px-5 py-4 whitespace-nowrap text-xs text-zinc-500">{fmtDate(run.startedAt)}</td>
                  </tr>
                {:else}<tr><td colspan="6" class="px-5 py-12 text-center text-zinc-500">No runs match these filters. Try a different suite, status or environment.</td></tr>{/each}
              </tbody>
            </table>
          </div>
          <nav aria-label="Run pagination" class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 text-xs text-zinc-500 dark:border-zinc-800"><span>{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} runs` : '0 matching runs'}</span><div class="flex items-center gap-3"><button disabled={visiblePage === 1} class="disabled:opacity-40" onclick={() => { currentPage = visiblePage - 1 }}>Previous</button><span>Page {visiblePage} of {pageCount}</span><button disabled={visiblePage === pageCount} class="disabled:opacity-40" onclick={() => { currentPage = visiblePage + 1 }}>Next</button></div></nav>
        {:else}<div class="px-6 py-14 text-center"><h2 class="section-heading">Your first run starts in Test suites</h2><p class="page-description mt-2">Select a test and run it. Its results and evidence will be saved here.</p><a class="action-link mt-5" href={`/projects/${projectId}/suites`}>Choose tests to run</a></div>{/if}
      </section>
    {/if}
  </div>
</div>

<SlidePanel open={detailOpen} title={selectedId ? `Run #${selectedId}` : 'Run details'} onclose={closeDetail}>
  <div class="p-5 space-y-5">
    {#if loadingRun}<p class="flex items-center gap-3 text-sm text-zinc-500" role="status"><Spinner />Loading run results…</p>
    {:else if detailError}<div class="error-banner" role="alert">{detailError}<button class="ml-2 underline" onclick={() => { const run = runs.find(run => run.id === selectedId); if (run) void selectRun(run) }}>Try again</button></div>
    {:else if selectedRun}
      <div><Badge variant={statusVariant(selectedRun.status)}>{selectedRun.status}</Badge><h2 class="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100 break-words">{selectedRun.suiteName ?? 'Manual run'}</h2><p class="mt-2 text-xs text-zinc-500">{fmtDate(selectedRun.startedAt)} · <span class="capitalize">{selectedRun.environment}</span> · {fmt(selectedRun.durationMs)}</p></div>
      <div class="rounded-lg bg-zinc-50 dark:bg-zinc-950 p-3 text-sm text-zinc-700 dark:text-zinc-300">{selectedRun.passedTests}/{selectedRun.totalTests} passed · {selectedRun.failedTests} failed{#if selectedRun.status === 'running' || selectedRun.status === 'pending'}<p class="mt-1 text-xs text-zinc-500">This run is in progress. Results update automatically.</p>{/if}</div>
      {#if selectedRun.errorMessage}<p class="error-banner whitespace-pre-wrap break-words" role="alert">{selectedRun.errorMessage}</p>{/if}
      <section aria-label="Test results" class="space-y-3">
        {#each [...selectedRun.results].sort((a, b) => Number(b.status === 'failed') - Number(a.status === 'failed') || a.order - b.order) as result (`${selectedRun.id}:${result.id}`)}
          <details open={result.status === 'failed'} class="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <summary class="cursor-pointer text-sm text-zinc-800 dark:text-zinc-200"><span class="font-medium break-words">{result.testName}</span><span class="mt-1 block text-xs text-zinc-500">{result.status} · {fmt(result.durationMs)}</span></summary>
            {#if result.errorMessage}<p class="mt-3 rounded bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">{result.errorMessage}</p>{/if}
            {#if result.failedStep}<p class="mt-2 text-xs text-zinc-500 break-words">Failed at: <code>{result.failedStep}</code></p>{/if}
            <RunEvidence {result} />
          </details>
        {:else}<p class="text-sm text-zinc-500">{selectedRun.status === 'running' || selectedRun.status === 'pending' ? 'Waiting for test results…' : 'This run has no test results. Review any run error above.'}</p>{/each}
      </section>
    {/if}
  </div>
</SlidePanel>
