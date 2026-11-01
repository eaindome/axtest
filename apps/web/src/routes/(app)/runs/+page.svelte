<script lang="ts">
  import { untrack } from 'svelte'
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import type { RunListItem } from '$lib/api'

  type WorkspaceRun = RunListItem & { projectId: number; projectName: string }
  let runs = $state<WorkspaceRun[]>([])
  let query = $state('')
  let status = $state('all')
  let limit = $state(25)
  let loading = $state(true)
  let error = $state('')
  let version = 0
  const filtered = $derived(runs.filter(run => (status === 'all' || run.status === status) && `${run.suiteName ?? 'Test run'} ${run.projectName} ${run.environment}`.toLowerCase().includes(query.trim().toLowerCase())))
  $effect(() => { const ws = $currentWorkspace; if (ws) untrack(() => { query = ''; status = 'all'; load(ws.id) }) })
  $effect(() => { query; status; limit = 25 })
  $effect(() => {
    pageTitle.set('Run history'); pageSubtitle.set('Runs across your workspace'); pageAction.set(null)
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })
  async function load(workspaceId: number) {
    const id = ++version
    loading = true; error = ''; runs = []; limit = 25
    try {
      const projects = await api().getProjects(workspaceId)
      const results = await Promise.allSettled(projects.map(async project => (await api().getRuns(project.id)).map(run => ({ ...run, projectId: project.id, projectName: project.name }))))
      if (id !== version) return
      runs = results.flatMap(result => result.status === 'fulfilled' ? result.value : []).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      if (results.some(result => result.status === 'rejected')) error = 'Some project history could not be loaded. Try refreshing.'
    } catch { if (id === version) error = 'Could not load run history. Please try again.' }
    finally { if (id === version) loading = false }
  }
  function variant(value: string): 'pass' | 'fail' | 'running' | 'pending' { return value === 'passed' ? 'pass' : value === 'failed' ? 'fail' : value === 'running' ? 'running' : 'pending' }
  function date(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }
</script>

<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950">
  <div class="page-shell space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="eyebrow mb-3">Workspace activity</p><h1 class="page-heading">Run history</h1><p class="page-description">Browse runs across your projects. Open a project to inspect its results.</p></div>
      <a href="/dashboard" class="action-link">Back to dashboard</a>
    </div>
    <div class="flex flex-wrap gap-3">
      <input bind:value={query} type="search" aria-label="Search run history" placeholder="Search tests, projects or environments…" class="min-w-0 flex-1 basis-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100" />
      <select bind:value={status} aria-label="Run status" class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"><option value="all">All statuses</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="running">Running</option><option value="pending">Pending</option></select>
      <button class="action-link" disabled={loading} onclick={() => $currentWorkspace && load($currentWorkspace.id)}>Refresh</button>
    </div>
    {#if error}<p class="error-banner" role="alert">{error}</p>{/if}
    <section class="surface overflow-hidden" aria-label="Run history">
      {#if loading}
        <div class="p-12 flex items-center justify-center gap-3" role="status"><Spinner size="sm" /><span class="text-sm text-zinc-500">Loading run history…</span></div>
      {:else if !filtered.length}
        <p class="p-12 text-center text-sm text-zinc-500">{runs.length ? 'No runs match your filters.' : 'No runs yet. Your results will appear here after your first run.'}</p>
      {:else}
        <div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">Showing {Math.min(limit, filtered.length)} of {filtered.length} runs</div>
        {#each filtered.slice(0, limit) as run}
          <a href="/projects/{run.projectId}/history" class="flex flex-wrap items-center gap-4 px-5 py-4 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <div class="min-w-0 flex-1 basis-48"><p class="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{run.suiteName ?? 'Test run'}</p><p class="text-xs text-zinc-500 mt-1 truncate">{run.projectName} · {run.environment}</p></div>
            <Badge variant={variant(run.status)}>{run.status}</Badge>
            <span class="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">{run.passedTests} of {run.totalTests} passed</span>
            <time datetime={run.startedAt} class="text-xs text-zinc-500 sm:w-40 sm:text-right">{date(run.startedAt)}</time>
          </a>
        {/each}
        {#if filtered.length > limit}<div class="px-5 py-4"><button class="action-link" onclick={() => limit += 25}>Show more runs</button></div>{/if}
      {/if}
    </section>
  </div>
</div>
