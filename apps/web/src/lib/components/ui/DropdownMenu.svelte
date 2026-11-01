<script lang="ts">
  import { tick, type Snippet } from 'svelte'
  export interface MenuOption { value: string; label: string; href?: string; disabled?: boolean; danger?: boolean; separator?: boolean }
  let { options, label, value, open = $bindable(false), id, onchange, trigger, class: cls = '' }: {
    options: MenuOption[]; label: string; value?: string; open?: boolean; id?: string
    onchange?: (value: string) => void; trigger?: Snippet; class?: string
  } = $props()
  const generatedId = $props.id()
  const menuId = $derived(id ?? generatedId)
  let root: HTMLDivElement | undefined = $state(), button: HTMLButtonElement | undefined = $state(), menu: HTMLDivElement | undefined = $state()
  let position = $state({ top: 0, left: 0, width: 208 })
  const selection = $derived(value !== undefined)
  function close(focus = false) { open = false; if (focus) button?.focus() }
  function place() {
    if (!button) return
    const rect = button.getBoundingClientRect(), width = Math.min(Math.max(rect.width, 208), innerWidth - 16)
    const height = menu?.offsetHeight ?? 0
    position = { width, left: Math.max(8, Math.min(rect.left, innerWidth - width - 8)), top: rect.bottom + 6 + height <= innerHeight - 8 ? rect.bottom + 6 : Math.max(8, rect.top - height - 6) }
  }
  async function toggle() {
    if (open) { close(); return }
    open = true; place(); await tick(); place()
    const selected = menu?.querySelector<HTMLElement>('[aria-selected="true"]')
    ;(selected ?? menu?.querySelector<HTMLElement>('[data-option]:not(:disabled)'))?.focus()
  }
  function choose(option: MenuOption) { if (!option.disabled) { close(true); onchange?.(option.value) } }
  function keys(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
    if (event.key === 'Tab') { close(true); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(menu?.querySelectorAll<HTMLElement>('[data-option]:not(:disabled)') ?? [])
    let index = items.indexOf(document.activeElement as HTMLElement)
    index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[index]?.focus()
  }
  function portal(node: HTMLElement) { document.body.appendChild(node); return { destroy() { node.remove() } } }
  $effect(() => {
    if (!open) return
    function outside(event: Event) { if (!event.composedPath().some(node => node === root || node === menu)) close() }
    document.addEventListener('mousedown', outside); document.addEventListener('focusin', outside)
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  })
</script>

<div bind:this={root} class="inline-flex {cls}">
  <button bind:this={button} type="button" aria-label={label} aria-haspopup={selection ? 'listbox' : 'menu'} aria-expanded={open} aria-controls={open ? menuId : undefined} onclick={toggle} onkeydown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) toggle() } }} class="{trigger ? 'size-8 justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800' : 'h-10 gap-3 px-3 justify-between border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100'} inline-flex items-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400/50">
    {#if trigger}{@render trigger()}{:else}<span>{options.find(option => option.value === value)?.label ?? label}</span><svg class="size-3.5 text-zinc-400 transition-transform duration-150 motion-reduce:transition-none {open ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m8 10 4 4 4-4" /></svg>{/if}
  </button>
</div>
{#if open}
  <div use:portal bind:this={menu} id={menuId} role={selection ? 'listbox' : 'menu'} aria-label={label} tabindex="-1" onkeydown={keys} class="{selection ? 'selection-menu' : ''} fixed z-[80] max-h-72 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-lg shadow-zinc-950/10" style={`top:${position.top}px;left:${position.left}px;width:${position.width}px`}>
    {#each options as option}
      {#if option.separator}<div role="separator" class="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>{/if}
      {#snippet contents()}<span class="min-w-0 flex-1 truncate">{option.label}</span>{#if selection && option.value === value}<svg class="size-4 shrink-0 text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" /></svg>{/if}{/snippet}
      {@const itemClass = `w-full flex items-center gap-3 text-left rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-0 ${option.danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40' : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 focus:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800'} disabled:opacity-40 disabled:cursor-not-allowed`}
      {#if option.href && !option.disabled}
        <a data-option role="menuitem" href={option.href} class={itemClass} onclick={() => choose(option)}>{@render contents()}</a>
      {:else}
        <button data-option type="button" role={selection ? 'option' : 'menuitem'} aria-selected={selection ? option.value === value : undefined} disabled={option.disabled} class={itemClass} onclick={() => choose(option)}>{@render contents()}</button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .selection-menu { animation: dropdown-in 160ms cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top left; }
  @keyframes dropdown-in { from { opacity: 0; transform: translateY(-5px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @media (prefers-reduced-motion: reduce) { .selection-menu { animation: none; } }
</style>
