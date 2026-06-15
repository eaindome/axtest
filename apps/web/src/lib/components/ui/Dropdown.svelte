<script lang="ts">
  import type { Snippet } from 'svelte'

  export interface DropdownOption {
    value: string
    label: string
    description?: string
    dot?: string
    disabled?: boolean
  }

  interface Props {
    value: string
    options: DropdownOption[]
    placeholder?: string
    size?: 'sm' | 'md'
    align?: 'left' | 'right'
    disabled?: boolean
    minWidth?: string
    class?: string
    onchange?: (value: string) => void
    trigger?: Snippet<[{ open: boolean; label: string }]>
  }

  let {
    value,
    options,
    placeholder = 'Select…',
    size = 'sm',
    align = 'left',
    disabled = false,
    minWidth = '120px',
    class: cls = '',
    onchange,
    trigger,
  }: Props = $props()

  let open = $state(false)
  let root = $state<HTMLDivElement | undefined>(undefined)
  let menuEl = $state<HTMLDivElement | undefined>(undefined)
  let menuPos = $state({ top: 0, left: 0, width: 120 })

  let selected = $derived(options.find(o => o.value === value))
  let label = $derived(selected?.label ?? placeholder)

  const sizeCls = $derived(size === 'md' ? 'h-9 px-2.5 text-sm gap-1.5' : 'h-8 px-2.5 text-sm gap-1')

  function parseMinWidth(): number {
    const n = parseInt(minWidth, 10)
    return Number.isFinite(n) ? n : 120
  }

  function syncMenuPosition() {
    if (!root) return
    const rect = root.getBoundingClientRect()
    const width = Math.max(rect.width, parseMinWidth())
    menuPos = {
      top: rect.bottom + 4,
      left: align === 'right' ? rect.right - width : rect.left,
      width,
    }
  }

  function select(opt: DropdownOption) {
    if (opt.disabled) return
    onchange?.(opt.value)
    open = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node)
    return {
      destroy() {
        node.remove()
      },
    }
  }

  $effect(() => {
    if (!open) return
    syncMenuPosition()
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (root?.contains(t) || menuEl?.contains(t)) return
      open = false
    }
    function onReposition() {
      syncMenuPosition()
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  })
</script>

<div bind:this={root} class="relative inline-block {cls}">
  {#if trigger}
    <button
      type="button"
      {disabled}
      onclick={() => !disabled && (open = !open)}
      aria-haspopup="listbox"
      aria-expanded={open}
      class="outline-none"
    >
      {@render trigger({ open, label })}
    </button>
  {:else}
    <button
      type="button"
      {disabled}
      onclick={() => !disabled && (open = !open)}
      aria-haspopup="listbox"
      aria-expanded={open}
      class="inline-flex items-center justify-between font-medium rounded-md border transition-colors w-full
             border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
             text-zinc-700 dark:text-zinc-200
             hover:bg-zinc-50 dark:hover:bg-zinc-700
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40
             disabled:opacity-50 disabled:cursor-not-allowed
             {sizeCls} {open ? 'ring-2 ring-amber-400/30 border-amber-400/50' : ''}"
      style="min-width: {minWidth}"
    >
      <span class="flex items-center gap-1.5 truncate">
        {#if selected?.dot}
          <span class="size-1.5 rounded-full shrink-0 {selected.dot}"></span>
        {/if}
        <span class="truncate">{label}</span>
      </span>
      <svg class="size-3 shrink-0 text-zinc-400 transition-transform {open ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>
  {/if}
</div>

{#if open}
  <div
    use:portal
    bind:this={menuEl}
    role="listbox"
    tabindex="-1"
    onkeydown={handleKeydown}
    class="fixed z-[200] py-1 rounded-lg border shadow-xl overflow-hidden max-h-64 overflow-y-auto
           bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
    style="top: {menuPos.top}px; left: {menuPos.left}px; min-width: {menuPos.width}px"
  >
    {#each options as opt}
      <button
        type="button"
        role="option"
        aria-selected={opt.value === value}
        disabled={opt.disabled}
        onclick={() => select(opt)}
        class="w-full flex items-start gap-2 px-2.5 py-2 text-left transition-colors
               {opt.value === value
                 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                 : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}
               {opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}"
      >
        {#if opt.dot}
          <span class="size-1.5 rounded-full shrink-0 mt-1.5 {opt.dot}"></span>
        {:else if opt.value === value}
          <span class="size-1.5 rounded-full shrink-0 mt-1.5 bg-amber-500"></span>
        {:else}
          <span class="size-1.5 shrink-0 mt-1.5"></span>
        {/if}
        <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{opt.label}</p>
            {#if opt.description}
              <p class="text-xs text-zinc-400 truncate mt-0.5">{opt.description}</p>
          {/if}
        </div>
        {#if opt.value === value}
          <svg class="size-3.5 shrink-0 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
          </svg>
        {/if}
      </button>
    {/each}
  </div>
{/if}
