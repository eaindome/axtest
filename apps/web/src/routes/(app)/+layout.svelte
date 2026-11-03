<script lang="ts">
  import { get } from 'svelte/store'
  import { authStore, setAuth, clearAuth } from '$lib/stores/auth'
  import { useMock } from '$lib/stores/dev'
  import { session, ApiError } from '$lib/api/real'
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
  let connectionError = $state('')
  let sidebarCompact = $state(false)

  const isEditor = $derived($page.url.pathname.startsWith('/editor'))

  onMount(() => {
    const saved = localStorage.getItem('axtest_sidebar_open')
    sidebarCompact = window.innerWidth < 1024 || saved === '0'
    void initialize()
    const expired = () => { clearAuth(); void goto('/login', { replaceState: true }) }
    window.addEventListener('axtest:session-expired', expired)
    return () => window.removeEventListener('axtest:session-expired', expired)
  })

  async function initialize() {
    ready = false
    connectionError = ''
    try {
      if (!get(useMock)) {
        const current = await session()
        if (!current.user) { clearAuth(); await goto('/login', { replaceState: true }); return }
        setAuth(current.user)
      } else if (!get(authStore).user) { await goto('/login', { replaceState: true }); return }
      const list = await api().getWorkspaces()
      if (!list.length) throw new Error('No workspace is available for this session.')
      workspaces.set(list)
      setWorkspace(list.find(w => w.id === savedWorkspaceId) ?? list[0])
      ready = true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth()
        await goto('/login', { replaceState: true })
        return
      }
      connectionError = error instanceof Error ? error.message : 'Could not open this workspace.'
    }
  }

  function toggleSidebarCompact() {
    sidebarCompact = !sidebarCompact
    localStorage.setItem('axtest_sidebar_open', sidebarCompact ? '0' : '1')
  }
</script>

{#if connectionError}
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
    <section class="surface p-8 max-w-lg w-full" role="alert"><p class="eyebrow mb-3">{$useMock ? 'Mock mode' : 'API mode'}</p><h1 class="section-heading">Workspace unavailable</h1><p class="page-description mb-6">{connectionError}</p><button class="action-link primary" onclick={initialize}>Try again</button><p class="text-xs text-zinc-500 mt-5">Use the data switch to change modes.</p></section>
  </div>
{:else if !ready}
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
        class="absolute top-4 left-3 z-40 size-8 rounded-md border border-zinc-200/80 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all duration-200"
        aria-label={sidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCompact}
        title={sidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg class="size-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
          {#if !sidebarCompact}<path d="M5.5 8h1M5.5 11h1M5.5 14h1" stroke-linecap="round" />{/if}
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
{/if}
<DevToggle />
