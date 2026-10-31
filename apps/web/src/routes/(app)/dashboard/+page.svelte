<script lang="ts">
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { globalProjects } from '$lib/stores/search'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import type { RunListItem, Project } from '$lib/api'
  type WorkspaceRun = RunListItem & { projectId: number; projectName: string }
  let projects = $state<Project[]>([])
  let runs = $state<WorkspaceRun[]>([])
  let loading = $state(true)
  let error = $state('')
  let requestId = 0
  $effect(() => { if ($currentWorkspace) load($currentWorkspace.id) })
  $effect(() => {
    pageTitle.set('Overview'); pageSubtitle.set('Your testing workspace')
    pageAction.set({ label: 'Open test editor', onclick: () => goto('/editor') })
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })
  async function load(workspaceId: number) {
    const id = ++requestId
    loading = true; error = ''
    try {
      const list = await api().getProjects(workspaceId)
      const results = await Promise.allSettled(list.map(async p => (await api().getRuns(p.id)).map(r => ({ ...r, projectId: p.id, projectName: p.name }))))
      if (id !== requestId) return
      projects = list; globalProjects.set(list)
      runs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      if (results.some(r => r.status === 'rejected')) error = 'Some run history could not be loaded. Please try again.'
    } catch { if (id === requestId) error = 'We couldn’t load your workspace. Check your connection and try again.' }
    finally { if (id === requestId) loading = false }
  }
  const completed = $derived(runs.filter(r => r.status === 'passed' || r.status === 'failed'))
  const passRate = $derived(completed.length ? Math.round(completed.filter(r => r.status === 'passed').length / completed.length * 100) : null)
  const failing = $derived(completed.filter(r => r.status === 'failed').length)
  const average = $derived(completed.length ? completed.reduce((n, r) => n + r.durationMs, 0) / completed.length : 0)
  function duration(ms: number) { return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s` }
  function status(s: string): 'pass' | 'fail' | 'running' | 'pending' { return s === 'passed' ? 'pass' : s === 'failed' ? 'fail' : s === 'running' ? 'running' : 'pending' }
  function date(value: string) { return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
</script>

<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950">
  <div class="page-shell space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div><p class="eyebrow mb-3">Workspace overview</p><h1 class="page-heading">A clearer view of quality.</h1><p class="page-description">Keep your projects, test runs, and next steps in one place.</p></div>
      <a class="action-link" href="/docs">Explore the guide</a>
    </div>
    {#if error}<div class="error-banner flex items-center justify-between gap-3" role="alert">{error}<button class="font-semibold underline shrink-0" onclick={() => $currentWorkspace && load($currentWorkspace.id)}>Try again</button></div>{/if}
    {#if loading}
      <div class="surface flex items-center justify-center gap-3 p-16" role="status"><Spinner size="sm" /><span class="text-sm text-zinc-500">Loading workspace…</span></div>
    {:else}
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {#each [
          { label: 'Projects', value: projects.length, hint: 'Applications under test', color: '' },
          { label: 'Run pass rate', value: passRate === null ? '—' : `${passRate}%`, hint: 'Across loaded completed runs', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Failed runs', value: failing, hint: failing ? 'Ready for investigation' : 'No failures in loaded history', color: failing ? 'text-red-600 dark:text-red-400' : '' },
          { label: 'Average duration', value: completed.length ? duration(average) : '—', hint: 'Per completed run', color: '' }
        ] as metric}
          <div class="surface p-5"><p class="text-sm text-zinc-500 dark:text-zinc-400">{metric.label}</p><p class="text-3xl font-semibold tracking-tight tabular-nums mt-4 mb-2 {metric.color || 'text-zinc-900 dark:text-zinc-100'}">{metric.value}</p><p class="text-xs text-zinc-500 dark:text-zinc-400">{metric.hint}</p></div>
        {/each}
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section class="surface overflow-hidden">
          <div class="px-5 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3"><div><h2 class="section-heading">Recent activity</h2><p class="text-xs text-zinc-500 mt-1">Latest runs across your projects</p></div><span class="text-xs text-zinc-500">{runs.length} loaded runs</span></div>
          {#if !runs.length}
            <div class="px-6 py-14 text-center"><p class="section-heading">Your first run starts here</p><p class="page-description mb-5">Open a project, write a test, and see your results here.</p><a class="action-link primary" href="/editor">Open test editor</a></div>
          {:else}
            {#each runs.slice(0, 8) as run}
              <a href="/projects/{run.projectId}" class="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <Badge variant={status(run.status)}>{run.status}</Badge>
                <div class="min-w-0 flex-1"><p class="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{run.suiteName ?? 'Test run'}</p><p class="text-xs text-zinc-500 mt-1 truncate">{run.projectName} / {run.environment}</p></div>
                <div class="text-right shrink-0"><p class="text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200">{run.passedTests}<span class="text-zinc-400"> / {run.totalTests}</span></p><p class="text-xs text-zinc-500 mt-1">{duration(run.durationMs)}</p></div>
                <time datetime={run.startedAt} class="hidden md:block text-xs text-zinc-500 w-28 text-right">{date(run.startedAt)}</time>
              </a>
            {/each}
          {/if}
        </section>
        <div class="space-y-5">
          <section class="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-6"><p class="eyebrow">From idea to assertion</p><h2 class="text-xl font-semibold tracking-tight mt-3 text-zinc-900 dark:text-zinc-100">Write it. Run it.<br />Know it works.</h2><p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 mt-3 mb-5">Describe the steps your users take. Build confidence with a repeatable test.</p><a href="/editor" class="action-link primary w-full">Write a test</a><a href="/docs?lesson=tutorial-1-create-file" class="block text-center text-xs font-medium text-amber-800 dark:text-amber-400 mt-4">Or follow the hands-on tutorial</a></section>
          <section class="surface p-5"><div class="flex items-center justify-between mb-4"><h2 class="section-heading">Your projects</h2><a href="/projects" class="text-xs text-amber-700 dark:text-amber-400 font-medium">View all</a></div>{#each projects.slice(0, 4) as project}<a href="/editor?project={project.id}" class="flex items-center gap-3 py-3 border-t border-zinc-100 dark:border-zinc-800"><span class="size-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-semibold text-zinc-500 text-sm shrink-0">{project.name.slice(0, 2).toUpperCase()}</span><div class="min-w-0 flex-1"><p class="text-sm font-medium truncate text-zinc-800 dark:text-zinc-200">{project.name}</p><p class="text-xs text-zinc-500 truncate">{project.baseUrl ?? 'No URL configured'}</p></div></a>{:else}<p class="text-sm text-zinc-500">Create a project to organize your tests.</p>{/each}</section>
        </div>
      </div>
    {/if}
  </div>
</div>
