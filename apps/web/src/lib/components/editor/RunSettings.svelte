<script lang="ts">
  import { tick } from 'svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import { speedOptions, type RunPreferences } from '$lib/run-preferences'
  import { useMock } from '$lib/stores/dev'
  let { value, disabled = false, onchange }: { value: RunPreferences; disabled?: boolean; onchange: (value: RunPreferences) => void } = $props()
  let open = $state(false), trigger = $state<HTMLButtonElement>(), panel = $state<HTMLElement>()
  let position = $state({ top: 0, left: 0, width: 320 })
  function close(focus = false) { open = false; if (focus) trigger?.focus() }
  function place() {
    if (!trigger) return
    const rect = trigger.getBoundingClientRect(), width = Math.min(320, innerWidth - 24), height = panel?.offsetHeight ?? 320
    position = { width, left: Math.max(12, Math.min(rect.right - width, innerWidth - width - 12)), top: rect.bottom + height + 8 < innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - height - 8) }
  }
  async function toggle() { if (open) close(); else { open = true; place(); await tick(); place(); panel?.querySelector<HTMLElement>('input:not(:disabled), button')?.focus() } }
  function portal(node: HTMLElement) { document.body.appendChild(node); return { destroy() { node.remove() } } }
  $effect(() => {
    if (!open) return
    function outside(event: Event) {
      const path = event.composedPath()
      if (path.includes(trigger!) || path.includes(panel!) || (event.target as Element)?.closest?.('[role="listbox"][aria-label="Execution speed"]')) return
      close()
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('focusin', outside)
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  })
  $effect(() => { if (disabled) close() })
</script>
<svelte:window onkeydown={event => { if (open && event.key === 'Escape') { event.preventDefault(); close(true) } }} />
<button bind:this={trigger} type="button" {disabled} aria-label="Run settings" aria-expanded={open} onclick={toggle} class="h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-700 dark:text-zinc-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400/50">Run settings <span class="ml-2 text-xs text-zinc-500">{value.headed ? 'Visible browser' : 'Headless'}</span></button>
{#if open}
  <section use:portal bind:this={panel} aria-label="Run settings" class="fixed z-[60] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-lg space-y-4 text-zinc-800 dark:text-zinc-200" style={`top:${position.top}px;left:${position.left}px;width:${position.width}px`}>
    <div class="flex justify-between items-center"><h2 class="text-sm font-semibold">Run settings</h2><button type="button" aria-label="Close run settings" class="text-zinc-500" onclick={() => close(true)}>×</button></div>
    <div><label class="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={value.headed} disabled={$useMock} class="accent-amber-700" onchange={event => onchange({ ...value, headed: event.currentTarget.checked })} />Show browser</label><p class="mt-2 text-xs text-zinc-500">{$useMock ? 'Mock mode simulates results. Browser settings apply in API mode.' : value.headed ? 'Chromium opens on the API computer. Short tests stay visible for at least four seconds.' : 'Runs in the background without opening a browser window.'}</p></div>
    <div class="space-y-2"><p class="text-xs font-medium text-zinc-500">Execution speed</p><DropdownMenu class="w-full" label="Execution speed" value={String(value.slowMoMs)} options={speedOptions} disabled={$useMock || !value.headed} onchange={speed => onchange({ ...value, slowMoMs: Number(speed) })} /><p class="text-xs text-zinc-500">Adds delay between browser actions when the browser is visible. Headless runs use full speed.</p></div>
    <p class="border-t border-zinc-100 dark:border-zinc-800 pt-3 text-xs text-zinc-500">Remembered for this project in Suites and the editor.</p>
  </section>
{/if}
