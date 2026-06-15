<script lang="ts">
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import type { RunListItem, Project } from '$lib/api'

  let projects = $state<Project[]>([])
  let runs     = $state<RunListItem[]>([])
  let loading  = $state(true)

  $effect(() => {
    const ws = $currentWorkspace
    if (ws) load(ws.id)
  })

  async function load(workspaceId: number) {
    loading = true
    try {
      const projs = await api().getProjects(workspaceId)
      projects = projs
      if (projs.length > 0) runs = await api().getRuns(projs[0].id)
    } catch {}
    loading = false
  }

  let passRate     = $derived(runs.length === 0 ? 0 : Math.round(runs.filter(r => r.status === 'passed').length / runs.length * 100))
  let totalTests   = $derived(runs.reduce((s, r) => s + r.totalTests, 0))
  let failingCount = $derived(runs.filter(r => r.status === 'failed').length)
  let avgMs        = $derived(runs.length === 0 ? 0 : Math.round(runs.reduce((s, r) => s + r.durationMs, 0) / runs.length))
  let firstName    = $derived($authStore.user?.name.split(' ')[0] ?? '')

  function fmt(ms: number) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  function statusVariant(s: RunListItem['status']): 'pass' | 'fail' | 'pending' | 'running' {
    return ({ passed: 'pass', failed: 'fail', pending: 'pending', running: 'running' } as const)[s] ?? 'pending'
  }

  $effect(() => {
    pageTitle.set(firstName ? `Welcome back, ${firstName}` : 'Dashboard')
    pageSubtitle.set($currentWorkspace ? `${$currentWorkspace.name} · ${projects.length} project${projects.length !== 1 ? 's' : ''}` : '')
    pageAction.set({ label: 'Run all tests', onclick: () => {} })
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })
</script>

{#if loading}
  <div class="flex items-center justify-center h-full">
    <Spinner size="lg" class="text-amber-500" />
  </div>
{:else}
<div class="flex-1 overflow-auto">

  <div class="px-5 py-4 space-y-5">

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-3">
      {#each [
        { label: 'Total Tests',   value: String(totalTests),   sub: `across ${runs.length} runs` },
        { label: 'Pass Rate',     value: `${passRate}%`,       sub: 'last 7 days',   color: passRate >= 90 ? 'text-green-600' : passRate >= 70 ? 'text-amber-600' : 'text-red-600' },
        { label: 'Failing Runs',  value: String(failingCount), sub: failingCount > 0 ? 'needs attention' : 'all clear', color: failingCount > 0 ? 'text-red-600' : undefined },
        { label: 'Avg Duration',  value: fmt(avgMs),           sub: 'per run' }
      ] as s}
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3">
          <p class="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{s.label}</p>
          <p class="text-2xl font-bold mt-1 tabular-nums {s.color ?? 'text-zinc-900 dark:text-zinc-100'}">{s.value}</p>
          <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{s.sub}</p>
        </div>
      {/each}
    </div>

    <!-- Recent runs -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Recent Runs</p>
        {#if projects[0]}
          <a href="/projects/{projects[0].id}" class="text-xs font-medium text-amber-600 hover:text-amber-700">View all →</a>
        {/if}
      </div>

      {#if runs.length === 0}
        <p class="text-sm text-zinc-400 py-6 text-center border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">No runs yet. Use the CLI to submit a run.</p>
      {:else}
        <div class="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
          {#each runs.slice(0, 6) as run}
            <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{run.suiteName ?? 'Manual Run'}</p>
                <p class="text-xs text-zinc-400 dark:text-zinc-500">{run.triggeredBy} · {run.environment}</p>
              </div>
              <div class="flex items-center gap-6 shrink-0 text-right">
                <div>
                  <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{run.passedTests}/{run.totalTests}</p>
                  <p class="text-xs text-zinc-400 dark:text-zinc-500">passed</p>
                </div>
                <div>
                  <p class="text-sm text-zinc-600 dark:text-zinc-400 tabular-nums">{fmt(run.durationMs)}</p>
                  <p class="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(run.startedAt)}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Projects -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Projects</p>
        <a href="/projects" class="text-xs font-medium text-amber-600 hover:text-amber-700">Manage →</a>
      </div>

      <div class="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
        {#each projects as project}
          <a href="/projects/{project.id}" class="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <div class="size-7 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5 text-amber-600 dark:text-amber-500">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{project.name}</p>
              {#if project.baseUrl}
                <p class="text-xs text-zinc-400 dark:text-zinc-500 truncate">{project.baseUrl}</p>
              {/if}
            </div>
            <div class="text-right text-xs text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
              <p>{project.runCount} runs</p>
              <p>{project.systemCount} systems</p>
            </div>
            <svg class="size-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </a>
        {/each}
      </div>
    </div>

  </div>
</div>
{/if}
