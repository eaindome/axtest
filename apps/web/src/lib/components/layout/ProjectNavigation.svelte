<script lang="ts">
  let { projectId, name = 'Project', active }: { projectId: number; name?: string; active: 'configuration' | 'suites' | 'history' } = $props()
</script>

<div class="space-y-4">
  <div class="flex items-center gap-2 text-sm min-w-0"><a href="/projects" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">Projects</a><span class="text-zinc-300 dark:text-zinc-600" aria-hidden="true">/</span><span class="truncate font-medium text-zinc-800 dark:text-zinc-200">{name}</span></div>
  <nav aria-label="Project navigation" class="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
    {#each [{ label: 'Configuration', href: `/projects/${projectId}`, key: 'configuration' }, { label: 'Test suites', href: `/projects/${projectId}/suites`, key: 'suites' }, { label: 'Run history', href: `/projects/${projectId}/history`, key: 'history' }] as item}
      <a href={item.href} aria-current={active === item.key ? 'page' : undefined} class="px-3 py-2.5 text-sm font-medium border-b-2 transition-colors {active === item.key ? 'border-amber-600 text-amber-800 dark:text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}">{item.label}</a>
    {/each}
  </nav>
</div>
