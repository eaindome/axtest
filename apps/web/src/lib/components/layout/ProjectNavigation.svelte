<script lang="ts">
  import { projectNames } from '$lib/stores/project-names'
  import { globalProjects } from '$lib/stores/search'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { useMock } from '$lib/stores/dev'
  let { projectId, name, active }: { projectId: number; name?: string; active: 'configuration' | 'suites' | 'history' } = $props()
  const identity = $derived(`${$useMock ? 'mock' : 'api'}:${$authStore.user?.id}:${$currentWorkspace?.id}:${projectId}`)
  const projectName = $derived(name ?? $projectNames[identity] ?? $globalProjects.find(project => project.id === projectId)?.name)
  $effect(() => {
    if (name && $projectNames[identity] !== name) projectNames.update(names => ({ ...names, [identity]: name! }))
  })
</script>

<div class="space-y-4">
  <nav aria-label="Project breadcrumb" class="flex items-center gap-2 text-sm min-w-0"><a href="/projects" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">Projects</a><span class="text-zinc-300 dark:text-zinc-600" aria-hidden="true">/</span>{#if projectName}<span aria-current="page" class="truncate font-medium text-zinc-800 dark:text-zinc-200">{projectName}</span>{:else}<span class="h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-800" aria-label="Loading project name"></span>{/if}</nav>
  <nav aria-label="Project navigation" class="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
    {#each [{ label: 'Configuration', href: `/projects/${projectId}`, key: 'configuration' }, { label: 'Test suites', href: `/projects/${projectId}/suites`, key: 'suites' }, { label: 'Run history', href: `/projects/${projectId}/history`, key: 'history' }] as item}
      <a href={item.href} aria-current={active === item.key ? 'page' : undefined} class="px-3 py-2.5 text-sm font-medium border-b-2 transition-colors {active === item.key ? 'border-amber-600 text-amber-800 dark:text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}">{item.label}</a>
    {/each}
  </nav>
</div>
