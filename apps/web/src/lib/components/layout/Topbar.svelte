<script lang="ts">
  import { page } from '$app/stores'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { darkMode } from '$lib/stores/theme'
  import Button from '$lib/components/ui/Button.svelte'
  import WorkspaceSwitcher from './WorkspaceSwitcher.svelte'
  const inProject = $derived($page.url.pathname.startsWith('/projects/') && !!$page.params.id)
</script>
<header class="h-16 shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 sm:gap-4 pl-14 pr-3 sm:pr-5">
  <WorkspaceSwitcher />
  {#if inProject}
    <div class="flex-1"></div>
  {:else}
    <span class="hidden sm:block text-zinc-300 dark:text-zinc-600" aria-hidden="true">/</span>
    <div class="flex-1 min-w-0"><p class="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{$pageTitle}</p>{#if $pageSubtitle}<p class="hidden lg:block text-xs text-zinc-500 truncate mt-0.5">{$pageSubtitle}</p>{/if}</div>
  {/if}
  <a href="/docs" class="hidden md:block text-xs font-medium text-zinc-500 hover:text-amber-700">Help & guides</a>
  <button onclick={() => darkMode.update(v => !v)} aria-label={$darkMode ? 'Switch to light theme' : 'Switch to dark theme'} title={$darkMode ? 'Switch to light theme' : 'Switch to dark theme'} class="hidden sm:flex size-9 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center shrink-0">
    <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">{#if $darkMode}<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>{:else}<path d="M20.9 13A9 9 0 0111 3.1 9 9 0 1020.9 13z"/>{/if}</svg>
  </button>
  {#if $pageAction}<Button size="sm" class="max-sm:px-2 max-sm:text-xs whitespace-nowrap" onclick={$pageAction.onclick}>{$pageAction.label}</Button>{/if}
</header>
