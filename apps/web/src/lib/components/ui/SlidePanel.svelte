<script lang="ts">
  import { fly, fade } from 'svelte/transition'
  import { tick } from 'svelte'

  let {
    open = $bindable(false),
    title = '',
    onclose,
    dismissible = true,
    children
  }: {
    open: boolean
    title?: string
    onclose?: () => void
    dismissible?: boolean
    children?: import('svelte').Snippet
  } = $props()
  let panel = $state<HTMLDivElement>()
  let restoreTo: HTMLElement | null = null
  function close() { if (dismissible) { if (onclose) onclose(); else open = false } }
  $effect(() => {
    if (!open) return
    restoreTo = document.activeElement as HTMLElement | null
    void tick().then(() => { if (open) (panel?.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled)') ?? panel?.querySelector<HTMLElement>('button:not(:disabled)') ?? panel)?.focus() })
    return () => { if (restoreTo && !restoreTo.matches(':disabled')) { restoreTo.focus(); restoreTo = null } }
  })
  $effect(() => { if (!open && dismissible) void tick().then(() => { restoreTo?.focus(); restoreTo = null }) })
  function handleKey(event: KeyboardEvent) {
    if (!open) return
    if (event.key === 'Escape') { event.preventDefault(); close() }
    if (event.key !== 'Tab') return
    const items = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') ?? []).filter(item => item.getClientRects().length)
    const first = items[0], last = items[items.length - 1]
    if (!first) { event.preventDefault(); panel?.focus(); return }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/25 z-40"
    transition:fade={{ duration: 180 }}
    role="presentation"
    onclick={close}
  ></div>

  <!-- Panel -->
  <div
    bind:this={panel}
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    class="fixed right-0 top-0 bottom-0 w-full max-w-[440px] bg-white dark:bg-zinc-900
           border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
    transition:fly={{ x: 420, duration: 260, opacity: 1 }}
  >
    <!-- Header -->
    <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
      <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <button
        onclick={close}
        disabled={!dismissible}
        aria-label="Close panel"
        class="size-7 rounded-md flex items-center justify-center text-zinc-400
               hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
      >
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto">
      {@render children?.()}
    </div>
  </div>
{/if}
