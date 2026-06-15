<script lang="ts">
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import type { Project, RunListItem, RunDetail } from '$lib/api'

  const projectId = $derived(Number($page.params.id))

  let project      = $state<Project | null>(null)
  let runs         = $state<RunListItem[]>([])
  let selectedRun  = $state<RunDetail | null>(null)
  let loading      = $state(true)
  let loadingRun   = $state(false)

  $effect(() => {
    const ws = $currentWorkspace
    const id = projectId
    if (ws && id) load(ws.id, id)
  })

  async function load(workspaceId: number, id: number) {
    loading = true
    try {
      const [projs, runList] = await Promise.all([
        api().getProjects(workspaceId),
        api().getRuns(id)
      ])
      project = projs.find(p => p.id === id) ?? null
      runs = runList
    } catch {}
    loading = false
  }

  async function selectRun(run: RunListItem) {
    if (selectedRun?.id === run.id) { selectedRun = null; return }
    loadingRun = true
    try { selectedRun = await api().getRun(projectId, run.id) } catch {}
    loadingRun = false
  }

  function fmt(ms: number) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
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


{#if loading}
  <div class="flex-1 flex items-center justify-center">
    <Spinner size="lg" class="text-amber-500" />
  </div>
{:else}
  <div class="flex-1 flex overflow-hidden min-h-0">

    <!-- Runs list (left panel) -->
    <div class="w-72 shrink-0 border-r border-zinc-200 flex flex-col overflow-hidden">
      <div class="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
        <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Runs</p>
        <span class="text-xs text-zinc-400">{runs.length}</span>
      </div>

      <div class="overflow-y-auto flex-1">
        {#if runs.length === 0}
          <div class="px-4 py-10 text-center">
            <p class="text-sm text-zinc-400">No runs yet.</p>
            <p class="text-xs text-zinc-400 mt-1">Use the CLI to submit a run.</p>
          </div>
        {:else}
          <div class="divide-y divide-zinc-100">
            {#each runs as run}
              <button
                onclick={() => selectRun(run)}
                class="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors
                       {selectedRun?.id === run.id ? 'bg-amber-50 border-l-[3px] border-amber-500 pl-[13px]' : 'border-l-[3px] border-transparent'}"
              >
                <div class="flex items-center gap-2 mb-0.5">
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                  <span class="text-xs text-zinc-400 tabular-nums ml-auto">{fmt(run.durationMs)}</span>
                </div>
                <p class="text-sm font-medium text-zinc-800 truncate">{run.suiteName ?? 'Manual Run'}</p>
                <p class="text-xs text-zinc-400 mt-0.5">{fmtDate(run.startedAt)}</p>
                <p class="text-xs text-zinc-400">{run.passedTests}/{run.totalTests} passed · {run.environment}</p>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Run detail (right panel) -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      {#if loadingRun}
        <div class="flex-1 flex items-center justify-center">
          <Spinner class="text-amber-500" />
        </div>
      {:else if !selectedRun}
        <div class="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div class="size-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
            <svg class="size-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p class="text-sm font-medium text-zinc-600">Select a run</p>
          <p class="text-xs text-zinc-400 mt-1">Click any run on the left to see its results</p>
        </div>
      {:else}
        <!-- Detail header -->
        <div class="px-5 py-3 border-b border-zinc-100 flex items-center gap-3 shrink-0">
          <Badge variant={statusVariant(selectedRun.status)}>{selectedRun.status}</Badge>
          <span class="text-sm font-medium text-zinc-800">{selectedRun.suiteName ?? 'Manual Run'}</span>
          <span class="ml-auto text-xs text-zinc-400 tabular-nums">
            {selectedRun.passedTests}/{selectedRun.totalTests} passed · {fmt(selectedRun.durationMs)}
          </span>
        </div>

        <!-- Results list -->
        <div class="overflow-y-auto flex-1 divide-y divide-zinc-100">
          {#each selectedRun.results as result}
            <div class="flex items-start gap-3 px-5 py-2.5 hover:bg-zinc-50 transition-colors">
              <!-- Status icon -->
              <div class="mt-0.5 shrink-0">
                {#if result.status === 'passed'}
                  <svg class="size-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                  </svg>
                {:else if result.status === 'failed'}
                  <svg class="size-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                  </svg>
                {:else}
                  <svg class="size-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm text-zinc-800">{result.testName}</p>
                {#if result.errorMessage}
                  <p class="text-xs text-red-600 mt-1 font-mono bg-red-50 rounded px-2 py-1">{result.errorMessage}</p>
                {/if}
                {#if result.failedStep}
                  <p class="text-xs text-zinc-400 mt-0.5">at: <code class="font-mono">{result.failedStep}</code></p>
                {/if}
              </div>

              <span class="text-xs text-zinc-400 shrink-0 tabular-nums">{fmt(result.durationMs)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
{/if}
