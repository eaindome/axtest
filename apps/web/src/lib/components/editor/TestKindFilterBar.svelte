<script lang="ts">
  import {
    TEST_KIND_FILTER_OPTIONS,
    TEST_KIND_STYLES,
    countByKind,
    type TestKindFilter,
  } from '$lib/editor/test-kind'
  import type { TestKind } from '$lib/editor/types'

  interface Props {
    tests: { kind: TestKind }[]
    value: TestKindFilter
    onchange: (filter: TestKindFilter) => void
    compact?: boolean
  }

  let { tests, value, onchange, compact = false }: Props = $props()

  const counts = $derived(countByKind(tests))

  function chipClass(filter: TestKindFilter, active: boolean): string {
    const base = 'rounded-full text-xs font-medium transition-all shrink-0 border '
    const pad = compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
    if (!active) {
      return base + pad + ' border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 hover:border-zinc-200/80 dark:hover:border-zinc-700'
    }
    if (filter === 'all') {
      return base + pad + ' border-zinc-300/80 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm'
    }
    if (filter === 'manual') {
      return base + pad + ' border-zinc-300/80 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm'
    }
    return base + pad + ' border-transparent shadow-sm ' + TEST_KIND_STYLES[filter]
  }
</script>

<div class="flex flex-wrap items-center gap-1 {compact ? 'gap-x-1 gap-y-1' : 'gap-1.5'}">
  {#each TEST_KIND_FILTER_OPTIONS as opt}
    {@const count = counts[opt.value]}
    {@const hidden = opt.value !== 'all' && count === 0}
    {#if !hidden}
      <button
        type="button"
        onclick={() => onchange(opt.value)}
        class="inline-flex items-center gap-1.5 {chipClass(opt.value, value === opt.value)}"
        title="Show {opt.label.toLowerCase()} tests"
      >
        <span>{opt.label}</span>
        {#if count > 0 && opt.value !== 'all'}
          <span class="opacity-70 tabular-nums min-w-[1ch] text-center">{count}</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>
