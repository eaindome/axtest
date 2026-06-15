<script lang="ts">
  import { useMock } from '$lib/stores/dev'
  import { dev } from '$app/environment'
</script>

{#if dev}
  <div class="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 bg-white border border-zinc-200 rounded-full shadow-md px-3.5 py-2">
    <span class="text-xs text-zinc-400 font-medium">API</span>

    <button
      onclick={() => useMock.update(v => !v)}
      role="switch"
      aria-checked={$useMock}
      aria-label="Toggle mock API"
      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors {
        $useMock ? 'bg-amber-500' : 'bg-zinc-300'
      }"
    >
      <span class="inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform {
        $useMock ? 'translate-x-4' : 'translate-x-0.5'
      }"></span>
    </button>

    <span class="text-xs font-semibold w-7 {$useMock ? 'text-amber-600' : 'text-zinc-400'}">
      {$useMock ? 'Mock' : 'Real'}
    </span>
  </div>
{/if}
