<script lang="ts">
  export interface SegmentOption {
    value: string
    label: string
    badge?: string | number
  }

  interface Props {
    value: string
    options: SegmentOption[]
    onchange: (value: string) => void
    size?: 'sm' | 'md'
    class?: string
    ariaLabel?: string
  }

  let {
    value,
    options,
    onchange,
    size = 'md',
    class: cls = '',
    ariaLabel = 'Switch view',
  }: Props = $props()

  const activeIndex = $derived(Math.max(0, options.findIndex(o => o.value === value)))
  const count = $derived(options.length)

  const textCls = $derived(size === 'sm' ? 'text-sm' : 'text-sm')
  const padCls = $derived(size === 'sm' ? 'px-3 py-1.5' : 'px-3.5 py-2')
</script>

<div
  class="relative grid p-0.5 rounded-lg border border-zinc-200/90 dark:border-zinc-700/90
         bg-zinc-100/60 dark:bg-zinc-900/80 shadow-sm {cls}"
  style="grid-template-columns: repeat({count}, minmax(0, 1fr))"
  role="tablist"
  aria-label={ariaLabel}
>
  <div
    class="absolute top-0.5 bottom-0.5 rounded-md bg-white dark:bg-zinc-800 shadow-sm
           ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 pointer-events-none
           transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
    style="width: calc((100% - 4px) / {count}); left: 2px; transform: translateX(calc({activeIndex} * 100%))"
  ></div>

  {#each options as opt}
    <button
      type="button"
      role="tab"
      aria-selected={value === opt.value}
      onclick={() => onchange(opt.value)}
      class="relative z-10 {padCls} {textCls} font-medium rounded-md whitespace-nowrap
             transition-colors duration-200 flex items-center justify-center gap-1.5
             {value === opt.value
               ? 'text-zinc-900 dark:text-zinc-100'
               : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}"
    >
      {opt.label}
      {#if opt.badge != null}
        <span
          class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold tabular-nums
                 {value === opt.value
                   ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                   : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}"
        >
          {opt.badge}
        </span>
      {/if}
    </button>
  {/each}
</div>
