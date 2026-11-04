<script lang="ts">
  import { darkMode } from '$lib/stores/theme'
  import { logout as apiLogout } from '$lib/api/real'
  import { useMock } from '$lib/stores/dev'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authStore, clearAuth } from '$lib/stores/auth'
  import { globalProjects } from '$lib/stores/search'
  import type { Project } from '$lib/api'
  import Logo from '$lib/components/layout/Logo.svelte'
  import { tutorialContinueLesson } from '$lib/stores/tutorial'

  interface Props {
    compact?: boolean
  }

  let { compact = false }: Props = $props()

  const nav = [
    { href: '/dashboard', label: 'Dashboard',   icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75' },
    { href: '/projects',  label: 'Projects',    icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
    { href: '/docs',      label: 'Knowledge base', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
    { href: '/settings',  label: 'Settings',    icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ]

  function isActive(href: string) {
    if (href === '/projects' && $page.url.pathname === '/editor' && $page.url.searchParams.has('project') && !$page.url.searchParams.has('lesson')) return true
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/')
  }

  let accountMenu: HTMLDetailsElement | undefined = $state()
  function closeAccountMenu() {
    if (accountMenu) accountMenu.open = false
  }
  function dismissAccountMenu(event: MouseEvent) {
    if (accountMenu && !accountMenu.contains(event.target as Node)) closeAccountMenu()
  }
  function handleAccountKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && accountMenu?.open) {
      closeAccountMenu()
      accountMenu.querySelector('summary')?.focus()
    }
  }

  let logoutError = $state('')
  async function logout() {
    if (!window.dispatchEvent(new Event('axtest:before-signout', { cancelable: true }))) return
    try { if (!$useMock) await apiLogout(); clearAuth(); await goto('/login', { replaceState: true }) }
    catch (error) { logoutError = error instanceof Error ? error.message : 'Could not sign out. Please try again.' }
  }

  let query      = $state('')
  let showSearch = $state(false)
  let searchRef  = $state<HTMLInputElement | null>(null)
  let isMac      = $state(false)

  let matchedNav = $derived(
    query.trim()
      ? nav.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
      : nav
  )

  let matchedProjects = $derived<Project[]>(
    query.trim()
      ? $globalProjects.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.description ?? '').toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5)
      : []
  )

  function openSearch() {
    showSearch = true
    setTimeout(() => searchRef?.focus(), 50)
  }

  function closeSearch() {
    showSearch = false
    query = ''
    searchRef?.blur()
  }

  function navigate(href: string) {
    goto(href)
    closeSearch()
  }

  onMount(() => {
    isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)

    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
      if (e.key === 'Escape' && showSearch) closeSearch()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
</script>

<svelte:window onclick={dismissAccountMenu} onkeydown={handleAccountKey} />

<aside class="{compact ? 'w-16' : 'w-60'} transition-[width] duration-300 ease-out shrink-0 flex flex-col h-screen bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800">
  <div class="h-16 {compact ? 'px-2 justify-center' : 'px-4'} flex items-center border-b border-zinc-200/80 dark:border-zinc-800">
    <a href="/dashboard" class="group min-w-0 transition-opacity hover:opacity-90">
      <Logo size="sm" tagline={compact ? null : 'Test automation'} stacked={compact} class="min-w-0" />
    </a>
  </div>

  <div class="relative px-3 transition-all duration-300 ease-out {compact ? 'pt-0 pb-0 max-h-0 opacity-0' : 'pt-3 pb-2 max-h-28 opacity-100'}">
    {#if !compact}
    <div class="relative">
      <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input bind:this={searchRef} bind:value={query} onfocus={() => (showSearch = true)} placeholder="Search…" aria-label="Search"
        class="w-full pl-8 py-2.5 text-sm rounded-lg bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 backdrop-blur-sm {isMac ? 'pr-12' : 'pr-16'}" />
      <kbd class="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700/80 border border-zinc-200/80 text-[9px] font-medium text-zinc-400 pointer-events-none">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
    </div>
    {#if showSearch && query.trim()}
      <div class="fixed inset-0 z-40 bg-zinc-900/10 dark:bg-black/30" role="presentation" onclick={closeSearch}></div>
      <div class="absolute left-3 right-3 top-full mt-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
        {#if matchedNav.length > 0}
          <div class="px-3 pt-2.5 pb-1"><p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Pages</p></div>
          {#each matchedNav as item}
            <button onclick={() => navigate(item.href)} class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-left">
              <div class="size-6 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <svg class="size-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d={item.icon} /></svg>
              </div>
              <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
            </button>
          {/each}
        {/if}
        {#if matchedProjects.length > 0}
          <div class="px-3 pt-2.5 pb-1 {matchedNav.length > 0 ? 'border-t border-zinc-100 dark:border-zinc-800 mt-1' : ''}"><p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Projects</p></div>
          {#each matchedProjects as project}
            <button onclick={() => navigate(`/projects/${project.id}`)} class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-left">
              <div class="size-6 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <svg class="size-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{project.name}</p>
                {#if project.baseUrl}<p class="text-xs text-zinc-400 truncate">{project.baseUrl}</p>{/if}
              </div>
            </button>
          {/each}
        {/if}
        {#if matchedNav.length === 0 && matchedProjects.length === 0}
          <div class="px-3 py-6 text-center"><p class="text-xs text-zinc-500">No results for "{query}"</p></div>
        {/if}
      </div>
    {/if}
    {/if}
  </div>

  {#if logoutError}<p class="error-banner mx-2" role="alert">{logoutError}</p>{/if}
  <nav class="flex-1 {compact ? 'px-2 py-2' : 'px-3 py-1'} overflow-y-auto sidebar-scroll">
    <p class="px-2.5 pb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-widest overflow-hidden transition-all duration-200 {compact ? 'max-h-0 opacity-0 pb-0' : 'max-h-8 opacity-100'}">Workspace</p>
    <div class="space-y-0.5">
      {#each nav as item}
        {@const active = isActive(item.href)}
        <a href={item.href} aria-current={active ? 'page' : undefined} title={compact ? item.label : undefined} class="group relative flex items-center {compact ? 'justify-center' : 'gap-2.5'} px-2.5 py-2 rounded-lg text-sm font-medium transition-all {active ? 'bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200'}">
          {#if active}<span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-amber-500"></span>{/if}
          <span class="size-7 rounded-md flex items-center justify-center shrink-0 {active ? 'bg-amber-50 dark:bg-amber-900/25' : 'group-hover:bg-zinc-100/80 dark:group-hover:bg-zinc-800/60'}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="size-4 {active ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}">
              <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
            </svg>
          </span>
          <span class="overflow-hidden whitespace-nowrap transition-all duration-200 {compact ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[140px] opacity-100 translate-x-0'}">{item.label}</span>
        </a>
      {/each}
    </div>
  </nav>

  {#if !compact && $tutorialContinueLesson && !$page.url.searchParams.has('lesson')}
    <div class="px-3 pb-2">
      <a
        href={$tutorialContinueLesson.href}
        class="block rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2.5 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 transition-colors"
      >
        <p class="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
          Continue tutorial
        </p>
        <p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
          Lesson {$tutorialContinueLesson.step} — {$tutorialContinueLesson.title}
        </p>
      </a>
    </div>
  {/if}

  <div class="px-2 py-1.5 border-t border-zinc-200/80 dark:border-zinc-800">
    <details bind:this={accountMenu} class="relative account-menu" onfocusout={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeAccountMenu()
    }}>
      <summary aria-label="Account options" title={compact ? 'Account options' : undefined} class="list-none cursor-pointer flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50">
        <img src="/avatars/open-peeps.svg" alt="" width="32" height="32" class="size-8 rounded-lg shrink-0 bg-orange-100 ring-1 ring-black/5 dark:ring-white/10" />
        {#if !compact}
          <span class="flex-1 min-w-0">
            <span class="block text-xs font-semibold truncate">{$authStore.user?.name ?? 'Account'}</span>
            <span class="block text-xs text-zinc-500 dark:text-zinc-400 truncate">{$authStore.user?.username ?? ''}</span>
          </span>
          <svg class="size-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="12" cy="19" r="1.75" /></svg>
        {/if}
      </summary>
      <div class="absolute bottom-0 left-[calc(100%+1rem)] w-56 z-50 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-900/10 p-1.5" aria-label="Account options">
        <div class="flex items-center gap-2.5 px-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
          <img src="/avatars/open-peeps.svg" alt="" width="36" height="36" class="size-9 rounded-lg shrink-0 bg-orange-100" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{$authStore.user?.name ?? 'Account'}</p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">{$authStore.user?.username ?? ''}</p>
          </div>
        </div>
        <a href="/settings" onclick={closeAccountMenu} class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="8" r="3.25" /><path stroke-linecap="round" d="M5 20v-2a7 7 0 0 1 14 0v2" /></svg>
          Account settings
        </a>
        <button type="button" onclick={() => { darkMode.update(value => !value); closeAccountMenu() }} class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400/50">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path stroke-linecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
          {$darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
        </button>
        <button onclick={() => { closeAccountMenu(); logout() }} class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H5v14h4m5-11 4 4-4 4m-5-4h9" /></svg>
          Sign out
        </button>
      </div>
    </details>
  </div>
</aside>

<style>
  .account-menu > summary::-webkit-details-marker { display: none; }
  .account-menu[open] > summary { background: var(--color-zinc-100); }
  :global(.dark) .account-menu[open] > summary { background: var(--color-zinc-800); }
  .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }
  :global(.dark) .sidebar-scroll { scrollbar-color: rgb(63 63 70 / 0.5) transparent; }
  :global(.dark) .sidebar-scroll::-webkit-scrollbar-thumb { background: rgb(63 63 70 / 0.5); }
</style>
