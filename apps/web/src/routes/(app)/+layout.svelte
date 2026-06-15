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

  const isEditor = $derived($page.url.pathname.startsWith('/editor'))

  onMount(async () => {
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
</script>

{#if !ready}
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
    <Spinner size="lg" class="text-amber-500" />
  </div>
{:else}
  <div class="flex h-screen bg-white dark:bg-zinc-950">
    <Sidebar />
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
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
