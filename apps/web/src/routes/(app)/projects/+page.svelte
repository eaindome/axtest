<script lang="ts">
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { globalProjects } from '$lib/stores/search'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import type { Project } from '$lib/api'

  let projects  = $state<Project[]>([])
  let loading   = $state(true)
  let loadError = $state('')
  let query = $state('')
  const filteredProjects = $derived(projects.filter(p => `${p.name} ${p.description ?? ''} ${p.baseUrl ?? ''}`.toLowerCase().includes(query.toLowerCase())))
  let showPanel = $state(false)
  let creating  = $state(false)
  let formError = $state('')
  let newName   = $state('')
  let newUrl    = $state('')
  let newDesc   = $state('')

  $effect(() => {
    const ws = $currentWorkspace
    if (ws) load(ws.id)
  })

  $effect(() => {
    pageTitle.set('Projects')
    pageSubtitle.set($currentWorkspace
      ? `${projects.length} project${projects.length !== 1 ? 's' : ''} in ${$currentWorkspace.name}`
      : '')
    pageAction.set({ label: 'New project', onclick: () => (showPanel = true) })
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })

  async function load(workspaceId: number) {
    loading = true
    loadError = ''
    try {
      projects = await api().getProjects(workspaceId)
      globalProjects.set(projects)
    } catch { loadError = 'We couldn’t load your projects. Please try again.' }
    loading = false
  }

  async function createProject() {
    const ws = $currentWorkspace
    if (!ws || !newName.trim()) return
    creating = true
    formError = ''
    try {
      const p = await api().createProject(ws.id, {
        name: newName.trim(),
        baseUrl: newUrl.trim() || undefined,
        description: newDesc.trim() || undefined
      })
      projects = [p, ...projects]
      globalProjects.set(projects)
      showPanel = false
      newName = newUrl = newDesc = ''
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Failed to create project'
    } finally {
      creating = false
    }
  }

  function closePanel() {
    showPanel = false
    newName = newUrl = newDesc = formError = ''
  }

</script>

<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950">
  <div class="page-shell space-y-7">
    <div><p class="eyebrow mb-3">Your applications</p><h1 class="page-heading">Projects</h1><p class="page-description">Choose an application to manage its test files, environments, and run history.</p></div>
    <div class="flex flex-wrap justify-between items-center gap-4">
      <p class="text-sm text-zinc-500">{projects.length} project{projects.length === 1 ? '' : 's'} in this workspace</p>
      <input bind:value={query} type="search" aria-label="Search projects" placeholder="Search projects…" class="h-10 w-full sm:w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-100" />
    </div>
    {#if loadError}<div class="error-banner flex items-center justify-between gap-3" role="alert">{loadError}<button class="underline font-semibold" onclick={() => $currentWorkspace && load($currentWorkspace.id)}>Try again</button></div>{/if}
    {#if loading}
      <div class="surface p-16 flex justify-center gap-3 items-center" role="status"><Spinner size="sm" /><span class="text-sm text-zinc-500">Loading projects…</span></div>
    {:else if !projects.length}
      <div class="surface px-6 py-16 text-center"><div class="size-14 mx-auto mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center text-2xl" aria-hidden="true">+</div><h2 class="section-heading">Give your tests a home</h2><p class="page-description mb-6">Create a project for your application, then write your first test.</p><Button onclick={() => showPanel = true}>Create your first project</Button></div>
    {:else if !filteredProjects.length}
      <div class="surface p-12 text-center"><h2 class="section-heading">No matching projects</h2><p class="page-description">Try another name or URL.</p><button class="mt-4 text-sm font-medium text-amber-700 dark:text-amber-400" onclick={() => query = ''}>Clear search</button></div>
    {:else}
      <section class="surface overflow-hidden" aria-label="Applications under test">
        <div class="hidden lg:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_220px] gap-6 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-500">
          <span>Application</span><span>Production URL</span><span>Runs</span><span class="text-right">Workspace</span>
        </div>
        {#each filteredProjects as project}
          <article class="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_220px] gap-4 lg:gap-6 lg:items-center px-6 py-5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
            <div class="flex items-start gap-3 min-w-0">
              <span class="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-semibold shrink-0" aria-hidden="true">{project.name.slice(0, 2).toUpperCase()}</span>
              <div class="min-w-0">
                <a href="/editor?project={project.id}" class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-amber-700">{project.name}</a>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1 line-clamp-2">{project.description || 'Test files and results for this application.'}</p>
              </div>
            </div>
            <p class="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate" title={project.baseUrl ?? ''}>{project.baseUrl || 'Not configured'}</p>
            <p class="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{project.runCount}<span class="lg:hidden"> runs</span></p>
            <div class="flex items-center justify-start lg:justify-end gap-2">
              <a class="action-link" href="/projects/{project.id}" aria-label={`View runs for ${project.name}`}>View runs</a>
              <a class="action-link primary" href="/editor?project={project.id}" aria-label={`Open tests for ${project.name}`}>Open tests</a>
            </div>
          </article>
        {/each}
      </section>
      <p class="text-xs text-zinc-500 leading-relaxed">One project per application. Configure staging and local environments inside the test editor.</p>
    {/if}
  </div>
</div>

<!-- New project slide panel -->
<SlidePanel bind:open={showPanel} title="New Project">
  <div class="p-5 space-y-4">
    <div class="space-y-3">
      <Input label="Project name" bind:value={newName} placeholder="e.g. Students Portal" required />
      <Input label="Production URL" bind:value={newUrl} placeholder="https://portal.example.com" type="url" />
      <p class="text-xs text-zinc-400 -mt-2">Used when running tests against production. Staging and local URLs can be set in the editor.</p>
      <Input label="Description" bind:value={newDesc} placeholder="What does this project test?" />
    </div>

    {#if formError}
      <p class="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
    {/if}

    <div class="pt-2 border-t border-zinc-100 flex gap-2">
      <Button onclick={createProject} loading={creating}>Create Project</Button>
      <Button variant="secondary" onclick={closePanel}>Cancel</Button>
    </div>

    <div class="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">What's a project?</p>
      <p class="text-xs text-zinc-500 leading-relaxed">
        A project maps to one web application. Inside each project you'll create test suites
        that run against the base URL you specify here.
      </p>
    </div>
  </div>
</SlidePanel>
