<script lang="ts">
  import { tick } from 'svelte'
  import { workspaces, currentWorkspace, setWorkspace } from '$lib/stores/workspace'
  import { globalProjects } from '$lib/stores/search'
  import { api } from '$lib/api'
  import type { Workspace } from '$lib/api'

  let showMenu = $state(false)
  let showNewForm = $state(false)
  let query = $state('')
  let newWsName = $state('')
  let creatingWs = $state(false)
  let error = $state('')
  let root: HTMLDivElement | undefined = $state()
  let trigger: HTMLButtonElement | undefined = $state()
  let searchInput: HTMLInputElement | undefined = $state()
  let nameInput: HTMLInputElement | undefined = $state()

  const filtered = $derived(
    $workspaces.filter(ws => ws.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || b.id - a.id)
  )

  function closeMenu(returnFocus = false) {
    showMenu = false; showNewForm = false; query = ''; error = ''
    if (returnFocus) trigger?.focus()
  }
  async function toggleMenu() {
    if (showMenu) { closeMenu(); return }
    showMenu = true; showNewForm = false; query = ''; error = ''
    await tick(); searchInput?.focus()
  }
  function switchTo(ws: Workspace) {
    if (!window.dispatchEvent(new Event('axtest:before-workspace-switch', { cancelable: true }))) return false
    globalProjects.set([]); setWorkspace(ws); closeMenu(true)
    return true
  }
  async function createWs() {
    if (!newWsName.trim() || creatingWs) return
    creatingWs = true; error = ''
    try {
      const ws = await api().createWorkspace(newWsName.trim())
      workspaces.update(list => [...list, ws])
      newWsName = ''; showNewForm = false
      switchTo(ws)
    } catch (err) { error = err instanceof Error ? err.message : 'Could not create workspace.' }
    finally { creatingWs = false }
  }
  function outsideClick(event: MouseEvent) {
    if (showMenu && root && !event.composedPath().includes(root)) closeMenu()
  }
</script>

<svelte:window onclick={outsideClick} onkeydown={(event) => { if (event.key === 'Escape' && showMenu) { event.preventDefault(); closeMenu(true) } }} />

<div bind:this={root} class="relative" onfocusout={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && !creatingWs) closeMenu() }}>
  <button bind:this={trigger} onclick={toggleMenu} aria-label="Switch workspace" aria-expanded={showMenu} aria-controls="workspace-picker"
    class="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors max-w-[180px]">
    <span class="text-xs font-medium truncate flex-1 text-left">{$currentWorkspace?.name ?? 'Select workspace'}</span>
    <svg class="size-3 text-zinc-400 shrink-0 transition-transform {showMenu ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
  </button>

  {#if showMenu}
    <div id="workspace-picker" class="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-5rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden" aria-label="Workspaces">
      <div class="p-2.5 border-b border-zinc-100 dark:border-zinc-800">
        <input bind:this={searchInput} bind:value={query} type="search" aria-label="Find workspace" placeholder="Find workspace…" class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0" />
      </div>
      <div class="max-h-[5.75rem] overflow-y-auto p-1.5" aria-label="Available workspaces">
        {#each filtered as ws}
          <button onclick={() => switchTo(ws)} aria-current={ws.id === $currentWorkspace?.id ? 'true' : undefined}
            class="w-full h-10 flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/50">
            <span class="min-w-0 flex-1"><span class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{ws.name}</span>
            </span>
            {#if ws.id === $currentWorkspace?.id}<svg class="size-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12 4 4L19 6" /></svg>{/if}
          </button>
        {:else}<p class="px-3 py-6 text-center text-sm text-zinc-500" role="status">No workspaces found.</p>{/each}
      </div>
      <div class="border-t border-zinc-100 dark:border-zinc-800 p-1.5">
        {#if error}<p role="alert" class="px-2.5 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>{/if}
        {#if showNewForm}
          <form class="p-1.5 space-y-2" onsubmit={(event) => { event.preventDefault(); createWs() }}>
            <input bind:this={nameInput} bind:value={newWsName} aria-label="Workspace name" placeholder="Workspace name" disabled={creatingWs} class="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
            <div class="flex gap-2"><button type="submit" disabled={creatingWs || !newWsName.trim()} class="action-link primary flex-1">{creatingWs ? 'Creating…' : 'Create'}</button><button type="button" disabled={creatingWs} onclick={() => { showNewForm = false; newWsName = ''; error = ''; searchInput?.focus() }} class="action-link">Cancel</button></div>
          </form>
        {:else}
          <button onclick={async () => { showNewForm = true; await tick(); nameInput?.focus() }} class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>New workspace
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
