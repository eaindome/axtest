<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import ResizeHandle from './ResizeHandle.svelte'
  import type { RunDetail } from '$lib/api'

  interface Props {
    open: boolean
    height: number
    running: boolean
    runResult: RunDetail | null
    onClose: () => void
    onResizeStart: () => void
    onResize: (delta: number) => void
  }

  let { open, height, running, runResult, onClose, onResizeStart, onResize }: Props = $props()

  function fmt(ms: number) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }
</script>

{#if open}
  <ResizeHandle
    direction="vertical"
    side="bottom"
    onResizeStart={onResizeStart}
    onResize={onResize}
  />

  <div class="flex flex-col shrink-0 bg-white dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800" style="height: {height}px">
    <div class="px-3 py-2 flex items-center gap-2 shrink-0 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
      <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Results</p>
      {#if runResult && !running}
        <Badge variant={runResult.status === 'passed' ? 'pass' : 'fail'}>
          {runResult.passedTests}/{runResult.totalTests} passed
        </Badge>
        <span class="text-xs text-zinc-400">{fmt(runResult.durationMs)}</span>
      {/if}
      <div class="flex-1"></div>
      <button onclick={onClose} aria-label="Close results" class="size-6 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto panel-scroll">
      {#if running}
        <div class="flex items-center justify-center h-full gap-2">
          <Spinner size="sm" class="text-amber-500" />
          <span class="text-sm text-zinc-400">Running tests…</span>
        </div>
      {:else if runResult}
        {#each runResult.results as r}
          <div class="flex items-start gap-3 px-3 py-2.5 border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 transition-colors">
            {#if r.status === 'passed'}
              <svg class="size-4 text-emerald-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            {:else}
              <svg class="size-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
              </svg>
            {/if}
            <div class="flex-1 min-w-0">
              <p class="text-sm text-zinc-800 dark:text-zinc-200">{r.testName}</p>
              {#if r.failedStep}
                <p class="text-xs text-zinc-400 font-mono mt-0.5 truncate">{r.failedStep}</p>
              {/if}
              {#if r.errorMessage}
                <p class="text-xs text-red-600 dark:text-red-400 mt-0.5 font-mono">{r.errorMessage}</p>
              {/if}
            </div>
            <span class="text-xs text-zinc-400 shrink-0 tabular-nums">{fmt(r.durationMs)}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .panel-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .panel-scroll::-webkit-scrollbar { width: 4px; }
  .panel-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }
  :global(.dark) .panel-scroll { scrollbar-color: rgb(63 63 70 / 0.5) transparent; }
  :global(.dark) .panel-scroll::-webkit-scrollbar-thumb { background: rgb(63 63 70 / 0.5); }
</style>
