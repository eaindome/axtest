<script lang="ts">
  import { fly, fade } from 'svelte/transition'

  let {
    open = $bindable(false),
    title = '',
    children
  }: {
    open: boolean
    title?: string
    children?: import('svelte').Snippet
  } = $props()
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/25 z-40"
    transition:fade={{ duration: 180 }}
    role="presentation"
    onclick={() => (open = false)}
  ></div>

  <!-- Panel -->
  <div
    class="fixed right-0 top-0 bottom-0 w-[400px] bg-white dark:bg-zinc-900
           border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
    transition:fly={{ x: 420, duration: 260, opacity: 1 }}
  >
    <!-- Header -->
    <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
      <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <button
        onclick={() => (open = false)}
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
