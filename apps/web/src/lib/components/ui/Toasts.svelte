<script lang="ts">
  import { onMount } from 'svelte'
  import { toasts, dismissToast, type Toast } from '$lib/stores/toasts'
  let timers = new Map<number, ReturnType<typeof setTimeout>>()
  const paused = new Set<number>()
  function pause(id: number) { clearTimeout(timers.get(id)); timers.delete(id); paused.add(id) }
  function resume(item: Toast) { pause(item.id); paused.delete(item.id); timers.set(item.id, setTimeout(() => dismissToast(item.id), item.kind === 'error' ? 12000 : 6000)) }
  onMount(() => {
    const unsubscribe = toasts.subscribe(items => {
      for (const item of items) if (!timers.has(item.id) && !paused.has(item.id)) resume(item)
      for (const id of timers.keys()) if (!items.some(item => item.id === id)) { pause(id); paused.delete(id) }
    })
    return () => { unsubscribe(); for (const timer of timers.values()) clearTimeout(timer) }
  })
</script>

<div class="fixed bottom-16 right-4 z-[100] flex w-[min(25rem,calc(100vw-2rem))] flex-col gap-3 pointer-events-none" aria-label="Notifications">
  {#each $toasts as item (item.id)}
    <div role={item.kind === 'error' ? 'alert' : 'status'} class="pointer-events-auto flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" onmouseenter={() => pause(item.id)} onmouseleave={() => resume(item)} onfocusin={() => pause(item.id)} onfocusout={() => resume(item)}>
      <span class={item.kind === 'error' ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>{item.kind === 'error' ? 'Error' : 'Done'}</span>
      <p class="min-w-0 flex-1 break-words">{item.message}</p>
      <button type="button" aria-label="Dismiss notification" class="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white focus-visible:outline focus-visible:outline-1" onclick={() => dismissToast(item.id)}>×</button>
    </div>
  {/each}
</div>
