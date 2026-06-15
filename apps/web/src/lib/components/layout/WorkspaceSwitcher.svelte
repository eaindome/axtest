<script lang="ts">
  import { workspaces, currentWorkspace, setWorkspace } from '$lib/stores/workspace'
  import { api } from '$lib/api'
  import type { Workspace } from '$lib/api'

  let showMenu     = $state(false)
  let showNewForm  = $state(false)
  let newWsName    = $state('')
  let creatingWs   = $state(false)

  function switchTo(ws: Workspace) {
    setWorkspace(ws)
    showMenu = false
    showNewForm = false
  }

  async function createWs() {
    if (!newWsName.trim()) return
    creatingWs = true
    try {
      const ws = await api().createWorkspace(newWsName.trim())
      workspaces.update(list => [...list, ws])
      switchTo(ws)
      newWsName = ''
      showNewForm = false
    } catch {}
    creatingWs = false
  }
</script>

<div class="relative">
  <button
    onclick={() => { showMenu = !showMenu; showNewForm = false }}
    class="flex items-center gap-2 px-2.5 py-1.5 rounded-md
           bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700
           border border-zinc-200 dark:border-zinc-700
           text-zinc-700 dark:text-zinc-300 transition-colors max-w-[180px]"
  >
    <div class="size-5 rounded bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
      <span class="text-[9px] font-bold text-amber-700 dark:text-amber-400">
        {($currentWorkspace?.name[0] ?? '?').toUpperCase()}
      </span>
    </div>
    <span class="text-xs font-medium truncate flex-1 text-left">
      {$currentWorkspace?.name ?? 'Select workspace'}
    </span>
    <svg
      class="size-3 text-zinc-400 shrink-0 transition-transform duration-150 {showMenu ? 'rotate-180' : ''}"
      fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  </button>

  {#if showMenu}
    <!-- Backdrop -->
    <div class="fixed inset-0 z-40" role="presentation" onclick={() => { showMenu = false; showNewForm = false }}></div>

    <!-- Dropdown -->
    <div class="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-zinc-800
                border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">

      <div class="py-1 max-h-52 overflow-y-auto">
        {#each $workspaces as ws}
          <button
            onclick={() => switchTo(ws)}
            class="w-full flex items-center gap-2.5 px-3 py-2
                   hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
          >
            <div class="size-5 rounded bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <span class="text-[9px] font-bold text-amber-700 dark:text-amber-400">{ws.name[0].toUpperCase()}</span>
            </div>
            <span class="text-xs text-zinc-700 dark:text-zinc-300 flex-1 truncate">{ws.name}</span>
            {#if ws.id === $currentWorkspace?.id}
              <svg class="size-3.5 text-amber-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
              </svg>
            {/if}
          </button>
        {/each}
      </div>

      <div class="border-t border-zinc-100 dark:border-zinc-700">
        {#if showNewForm}
          <div class="p-3 space-y-2">
            <input
              bind:value={newWsName}
              onkeydown={(e) => e.key === 'Enter' && createWs()}
              placeholder="Workspace name"
              class="w-full text-xs border border-zinc-200 dark:border-zinc-600 rounded-md px-2.5 py-1.5
                     bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100
                     focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400
                     placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <div class="flex gap-1.5">
              <button
                onclick={createWs}
                disabled={creatingWs || !newWsName.trim()}
                class="flex-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white
                       rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
              >
                {creatingWs ? 'Creating…' : 'Create'}
              </button>
              <button
                onclick={() => { showNewForm = false; newWsName = '' }}
                class="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                       px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        {:else}
          <button
            onclick={() => (showNewForm = true)}
            class="w-full flex items-center gap-2 px-3 py-2
                   hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
          >
            <div class="size-5 rounded border border-dashed border-zinc-300 dark:border-zinc-600
                        flex items-center justify-center shrink-0">
              <svg class="size-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span class="text-xs text-zinc-400 dark:text-zinc-500">New workspace</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
