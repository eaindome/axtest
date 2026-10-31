<script lang="ts">
  import { darkMode } from '$lib/stores/theme'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  $effect(() => {
    pageTitle.set('Settings'); pageSubtitle.set('Make this workspace yours'); pageAction.set(null)
    return () => { pageTitle.set(''); pageSubtitle.set('') }
  })
</script>
<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950"><div class="page-shell space-y-8">
  <div><p class="eyebrow mb-3">Preferences</p><h1 class="page-heading">Your workspace, your way.</h1><p class="page-description">Manage how axtest looks on this device.</p></div>
  <div class="max-w-3xl space-y-5">
    <section class="surface p-6"><h2 class="section-heading">Appearance</h2><p class="text-sm text-zinc-500 mt-2 mb-5">Choose a theme that suits your working environment.</p><div class="grid grid-cols-2 gap-4">
      {#each [{ dark: false, label: 'Light', hint: 'A clear, bright workspace' }, { dark: true, label: 'Dark', hint: 'Easy on the eyes after hours' }] as theme}
        <button onclick={() => darkMode.set(theme.dark)} aria-pressed={$darkMode === theme.dark} class="rounded-xl border-2 p-3 text-left transition-colors {$darkMode === theme.dark ? 'border-amber-600' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'}"><div class="h-24 rounded-lg border p-3 flex gap-2 {theme.dark ? 'bg-zinc-950 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}" aria-hidden="true"><div class="w-7 rounded {theme.dark ? 'bg-zinc-800' : 'bg-white'}"></div><div class="flex-1 space-y-2"><div class="w-1/2 h-2 rounded bg-amber-600"></div><div class="h-12 rounded {theme.dark ? 'bg-zinc-800' : 'bg-white'}"></div></div></div><p class="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{theme.label}</p><p class="mt-1 text-xs text-zinc-500">{theme.hint}</p></button>
      {/each}
    </div></section>
    <section class="surface p-6"><h2 class="section-heading">Current workspace</h2><dl class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm"><div><dt class="text-xs text-zinc-500 mb-1">Workspace</dt><dd class="font-medium text-zinc-800 dark:text-zinc-200">{$currentWorkspace?.name ?? 'No workspace selected'}</dd></div><div><dt class="text-xs text-zinc-500 mb-1">Signed in as</dt><dd class="font-medium text-zinc-800 dark:text-zinc-200">{$authStore.user?.email ?? 'Signed-in session'}</dd></div></dl></section>
    <section class="surface p-6 flex flex-wrap items-center justify-between gap-4"><div><h2 class="section-heading">Need a hand?</h2><p class="text-sm text-zinc-500 mt-2">Learn the syntax or work through a guided lesson.</p></div><a href="/docs" class="action-link">Open knowledge base</a></section>
  </div>
</div></div>
