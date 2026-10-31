<script lang="ts">
  import { onDestroy } from 'svelte'
  import { screenshotBlob } from '$lib/api/real'
  import type { ResultItem } from '$lib/api'
  let { result }: { result: ResultItem } = $props()
  let preview = $state('')
  let loading = $state(false)
  let error = $state('')
  let controller: AbortController | undefined
  let disposed = false
  async function showScreenshot() {
    if (preview) { URL.revokeObjectURL(preview); preview = ''; return }
    loading = true; error = ''
    controller = new AbortController()
    try {
      const blob = await screenshotBlob(result.screenshotUrl!, controller.signal)
      if (!disposed) preview = URL.createObjectURL(blob)
    } catch (err) { if (!disposed) error = err instanceof Error ? err.message : 'Could not load screenshot.' }
    finally { loading = false }
  }
  onDestroy(() => { disposed = true; controller?.abort(); if (preview) URL.revokeObjectURL(preview) })
</script>

{#if result.skipReason}<p class="text-xs text-zinc-500 mt-1">{result.skipReason}</p>{/if}
{#if result.steps?.length}
  <details class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
    <summary class="cursor-pointer font-medium">{result.steps.length} steps</summary>
    <ol class="mt-2 space-y-2 border-l border-zinc-200 dark:border-zinc-700 pl-3">
      {#each result.steps as step}
        <li><div class="flex gap-2 justify-between"><span class="font-mono break-words min-w-0">{step.raw}</span><span class="shrink-0 {step.status === 'failed' ? 'text-red-600 dark:text-red-400' : ''}">{step.status} · {step.durationMs}ms</span></div>{#if step.error}<p class="text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap break-words">{step.error}</p>{/if}</li>
      {/each}
    </ol>
  </details>
{/if}
{#if result.screenshotUrl}
  <button type="button" onclick={showScreenshot} disabled={loading} class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400 underline underline-offset-2">{loading ? 'Loading screenshot…' : preview ? 'Hide screenshot' : 'View screenshot'}</button>
{/if}
{#if error}<p class="text-xs text-red-600 mt-2" role="alert">{error}</p>{/if}
{#if preview}<a href={preview} target="_blank" rel="noreferrer" aria-label="Open failure screenshot in a new tab"><img src={preview} alt="Screenshot captured when this test failed" class="mt-3 max-h-80 max-w-full rounded-lg border border-zinc-200 dark:border-zinc-700 object-contain" /></a>{/if}
