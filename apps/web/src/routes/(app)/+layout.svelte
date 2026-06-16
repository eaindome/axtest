<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { workspaces, currentWorkspace, setWorkspace, savedWorkspaceId } from '$lib/stores/workspace'
  import Sidebar from '$lib/components/layout/Sidebar.svelte'
  import Topbar from '$lib/components/layout/Topbar.svelte'
  import DevToggle from '$lib/components/layout/DevToggle.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  let { children } = $props()
  let ready = $state(false)
  let sidebarCompact = $state(false)

  const isEditor = $derived($page.url.pathname.startsWith('/editor'))

  onMount(async () => {
    const saved = localStorage.getItem('axtest_sidebar_open')
    if (saved != null) sidebarCompact = saved === '0'

    if (!localStorage.getItem('axtest_token')) {
      goto('/login', { replaceState: true })
      return
    }

    try {
      const list = await api().getWorkspaces()
      workspaces.set(list)
      const ws = list.find(w => w.id === savedWorkspaceId) ?? list[0]
      if (ws) setWorkspace(ws)
    } catch {
      // non-fatal — pages handle missing workspace gracefully
    }

    ready = true
  })

  function toggleSidebarCompact() {
    sidebarCompact = !sidebarCompact
    localStorage.setItem('axtest_sidebar_open', sidebarCompact ? '0' : '1')
  }
</script>

{#if !ready}
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
    <Spinner size="lg" class="text-amber-500" />
  </div>
{:else}
  <div class="flex h-screen bg-white dark:bg-zinc-950">
    <Sidebar compact={sidebarCompact} />
    <div class="relative flex flex-col flex-1 min-w-0 overflow-hidden">
      <button
        type="button"
        onclick={toggleSidebarCompact}
        class="absolute top-3 left-3 z-40 size-8 rounded-md border border-zinc-200/80 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all duration-200"
        aria-label={sidebarCompact ? 'Expand sidebar' : 'Shrink sidebar'}
        title={sidebarCompact ? 'Expand sidebar' : 'Shrink sidebar'}
      >
        <svg class="size-4 mx-auto transition-transform duration-200 {sidebarCompact ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {#if !isEditor}
        <Topbar />
      {/if}
      <main class="flex-1 flex flex-col min-h-0 overflow-hidden">
        {@render children()}
      </main>
    </div>
  </div>
  <DevToggle />
{/if}
