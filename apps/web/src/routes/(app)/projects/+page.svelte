<script lang="ts">
  import { api } from '$lib/api'
  import { toast } from '$lib/stores/toasts'
  import { tick } from 'svelte'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { globalProjects } from '$lib/stores/search'
  import Button from '$lib/components/ui/Button.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import DropdownMenu, { type MenuOption } from '$lib/components/ui/DropdownMenu.svelte'
  import type { Project } from '$lib/api'

  let projects  = $state<Project[]>([])
  let loading   = $state(true)
  let loadError = $state('')
  let query = $state('')
  let projectStatus = $state<'active' | 'archived'>('active')
  let lifecycleBusy = $state(false)
  const statusCount = $derived(projects.filter(item => projectStatus === 'archived' ? !!item.archivedAt : !item.archivedAt).length)
  let openActions = $state<number | null>(null)
  function closeActions() { openActions = null }
  function projectOptions(project: Project): MenuOption[] {
    return [
      { value: 'view', label: 'View project details' },
      { value: 'edit', label: 'Edit details', disabled: !!project.archivedAt },
      { value: 'open', label: 'Open project', href: `/projects/${project.id}` },
      ...(project.archivedAt ? [
        { value: 'restore', label: 'Restore project', separator: true, disabled: lifecycleBusy },
        { value: 'delete', label: 'Delete permanently', danger: true, disabled: lifecycleBusy }
      ] : [{ value: 'archive', label: 'Archive project', separator: true, disabled: lifecycleBusy }])
    ]
  }
  function projectAction(project: Project, action: string) {
    if (action === 'view' || action === 'edit') openDetails(project, action)
    else if (action === 'archive' || action === 'restore' || action === 'delete') void changeLifecycle(project, action)
  }
  const filteredProjects = $derived(projects.filter(p => (projectStatus === 'archived' ? !!p.archivedAt : !p.archivedAt) && `${p.name} ${p.description ?? ''} ${p.baseUrl ?? ''}`.toLowerCase().includes(query.toLowerCase())))
  const pageSize = 10
  let pageIndex = $state(1)
  let projectList: HTMLElement | undefined = $state()
  const pageCount = $derived(Math.max(1, Math.ceil(filteredProjects.length / pageSize)))
  const currentPage = $derived(Math.min(pageIndex, pageCount))
  const pageStart = $derived((currentPage - 1) * pageSize)
  const visibleProjects = $derived(filteredProjects.slice(pageStart, pageStart + pageSize))
  const pageNumbers = $derived([...new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1])].filter(page => page > 0 && page <= pageCount).sort((a, b) => a - b))
  $effect(() => { query; projectStatus; pageIndex = 1; closeActions() })
  async function changePage(page: number) {
    pageIndex = Math.max(1, Math.min(page, pageCount)); closeActions()
    await tick()
    projectList?.scrollIntoView({ block: 'start' })
  }

  let showPanel = $state(false)
  let creating  = $state(false)
  let formError = $state('')
  let newName   = $state('')
  let newUrl    = $state('')
  let newDesc   = $state('')
  let showDetails = $state(false)
  let detailsProject = $state<Project | null>(null)
  let detailsMode = $state<'view' | 'edit'>('view')
  let editName = $state(''), editUrl = $state(''), editDescription = $state('')
  let savingDetails = $state(false), detailsError = $state('')
  function openDetails(project: Project, mode: 'view' | 'edit') {
    closeActions()
    detailsProject = project; detailsMode = mode; detailsError = ''; showDetails = true
    editName = project.name; editUrl = project.baseUrl ?? ''; editDescription = project.description ?? ''
  }
  function closeDetails() { showDetails = false; detailsError = '' }
  async function saveDetails() {
    const workspace = $currentWorkspace
    const project = detailsProject
    if (!workspace || !project || savingDetails || !editName.trim()) return
    savingDetails = true; detailsError = ''
    try {
      const updated = await api().updateProject(workspace.id, project.id, { name: editName.trim(), baseUrl: editUrl.trim() || undefined, description: editDescription.trim() || undefined })
      if ($currentWorkspace?.id !== workspace.id) return
      projects = projects.map(item => item.id === project.id ? updated : item)
      globalProjects.set(projects.filter(item => !item.archivedAt))
      closeDetails(); toast('Project details saved.')
    } catch (err) { toast(err instanceof Error ? err.message : 'Could not save project details.', 'error') }
    finally { savingDetails = false }
  }
  async function changeLifecycle(project: Project, action: 'archive' | 'restore' | 'delete') {
    const workspace = $currentWorkspace
    if (!workspace || lifecycleBusy) return
    if (action === 'archive' && !confirm(`Archive ${project.name}? Configuration and history will be kept. Restore it to run tests again.`)) return
    if (action === 'delete' && !confirm(`Permanently delete ${project.name}, including its tests, saved accounts, and run history? This cannot be undone.`)) return
    closeActions(); lifecycleBusy = true; loadError = ''
    try {
      if (action === 'archive') await api().archiveProject(workspace.id, project.id)
      else if (action === 'restore') await api().restoreProject(workspace.id, project.id)
      else await api().deleteProject(workspace.id, project.id)
      if ($currentWorkspace?.id !== workspace.id) return
      if (action === 'delete') projects = projects.filter(item => item.id !== project.id)
      else projects = projects.map(item => item.id === project.id ? { ...item, archivedAt: action === 'archive' ? new Date().toISOString() : null } : item)
      globalProjects.set(projects.filter(item => !item.archivedAt)); toast(action === 'delete' ? 'Project deleted.' : action === 'archive' ? 'Project archived.' : 'Project restored.')
    } catch (err) { toast(err instanceof Error ? err.message : 'Could not update the project.', 'error') }
    finally { lifecycleBusy = false }
  }

  function projectDate(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }


  $effect(() => {
    const ws = $currentWorkspace
    if (ws) load(ws.id)
  })

  $effect(() => {
    pageTitle.set('Projects')
    pageSubtitle.set($currentWorkspace
      ? `${projects.length} project${projects.length !== 1 ? 's' : ''} in ${$currentWorkspace.name}`
      : '')
    pageAction.set(null)
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })

  async function load(workspaceId: number) {
    loading = true
    pageIndex = 1
    openActions = null
    closeDetails()
    projects = []
    loadError = ''
    try {
      projects = await api().getProjects(workspaceId)
      globalProjects.set(projects.filter(item => !item.archivedAt))
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
      pageIndex = 1
      projects = [p, ...projects]
      globalProjects.set(projects.filter(item => !item.archivedAt))
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

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') { if (showDetails && !savingDetails) closeDetails(); else if (showPanel && !creating) closePanel() } }} />

<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950">
  <div class="page-shell space-y-7">
    <div><p class="eyebrow mb-3">Your applications</p><h1 class="page-heading">Projects</h1><p class="page-description">Choose an application to manage its test files, environments, and run history.</p></div>
    <div class="flex flex-wrap justify-between items-center gap-4">
      <p class="text-sm text-zinc-500">{statusCount} {projectStatus} project{statusCount === 1 ? '' : 's'}</p>
      <div class="flex w-full sm:w-auto flex-wrap items-center gap-3">
        <DropdownMenu label="Project status" value={projectStatus} options={[{ value: 'active', label: 'Active projects' }, { value: 'archived', label: 'Archived projects' }]} onchange={value => { projectStatus = value as 'active' | 'archived' }} />
        <input bind:value={query} type="search" aria-label="Search projects" placeholder="Search projects…" class="focus:outline-none focus:ring-1 focus:ring-zinc-400/40 focus:border-zinc-400 dark:focus:border-zinc-500 h-10 min-w-0 flex-1 sm:flex-none w-full sm:w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-100" />
        <Button onclick={() => showPanel = true}>New project</Button>
      </div>
    </div>
    {#if loadError}<div class="error-banner flex items-center justify-between gap-3" role="alert">{loadError}<button class="underline font-semibold" onclick={() => $currentWorkspace && load($currentWorkspace.id)}>Try again</button></div>{/if}
    {#if loading}
      <div class="surface p-16 flex justify-center gap-3 items-center" role="status"><Spinner size="sm" /><span class="text-sm text-zinc-500">Loading projects…</span></div>
    {:else if !projects.length}
      <div class="surface px-6 py-16 text-center"><div class="size-14 mx-auto mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center text-2xl" aria-hidden="true">+</div><h2 class="section-heading">Give your tests a home</h2><p class="page-description mb-6">Create a project for your application, then write your first test.</p><Button onclick={() => showPanel = true}>Create your first project</Button></div>
    {:else if !filteredProjects.length}
      <div class="surface p-12 text-center"><h2 class="section-heading">{query.trim() ? 'No matching projects' : `No ${projectStatus} projects`}</h2><p class="page-description">{query.trim() ? 'Try another name or URL.' : projectStatus === 'archived' ? 'Archived projects will appear here.' : 'Create a project or restore one from the Archived projects filter.'}</p>{#if query.trim()}<button class="mt-4 text-sm font-medium text-amber-700 dark:text-amber-400" onclick={() => query = ''}>Clear search</button>{/if}</div>
    {:else}
      <section bind:this={projectList} class="surface scroll-mt-4" aria-label="Applications under test">
        <div class="hidden lg:grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_80px] gap-6 px-6 py-3 rounded-t-2xl border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-500">
          <span>Actions</span><span>Application</span><span>Production URL</span><span>Runs</span>
        </div>
        {#each visibleProjects as project}
          <article class="grid grid-cols-[32px_minmax(0,1fr)] lg:grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_80px] h-[132px] lg:h-[88px] grid-rows-[40px_16px_20px] lg:grid-rows-1 gap-x-4 gap-y-2 lg:gap-6 lg:items-center px-6 py-4 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
            <div class="self-start lg:self-center">
              <DropdownMenu label={`Actions for ${project.name}`} id={`project-actions-${project.id}`} options={projectOptions(project)} bind:open={() => openActions === project.id, value => { openActions = value ? project.id : null }} onchange={value => projectAction(project, value)}>
                {#snippet trigger()}<svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="12" cy="19" r="1.75" /></svg>{/snippet}
              </DropdownMenu>
            </div>
            <div class="col-start-2 lg:col-auto flex items-start gap-3 min-w-0">
              <div class="min-w-0 w-full">
                <a href="/projects/{project.id}" class="block truncate text-sm leading-5 font-semibold text-zinc-900 dark:text-zinc-100 hover:text-amber-700" title={project.name}>{project.name}</a>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-4 mt-1 truncate" title={project.description ?? undefined}>{project.description || 'Test files and results for this application.'}</p>
              </div>
            </div>
            <p class="col-start-2 lg:col-auto text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate" title={project.baseUrl ?? ''}>{project.baseUrl || 'Not configured'}</p>
            <p class="col-start-2 lg:col-auto text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{project.runCount}<span class="lg:hidden ml-1">runs</span></p>

          </article>
        {/each}
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p class="text-xs text-zinc-500 dark:text-zinc-400" role="status">Showing {pageStart + 1} to {Math.min(pageStart + pageSize, filteredProjects.length)} of {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}</p>
          <nav aria-label="Project pagination" class="flex flex-wrap items-center gap-1">
            <button class="focus-visible:ring-0 pagination-button" disabled={currentPage === 1} onclick={() => changePage(currentPage - 1)}>Previous</button>
            {#each pageNumbers as number, index}
              {#if index > 0 && number - pageNumbers[index - 1] > 1}<span class="px-1 text-xs text-zinc-400" aria-hidden="true">…</span>{/if}
              <button class="focus-visible:ring-0 pagination-button {number === currentPage ? 'pagination-current' : ''}" aria-label={`Page ${number}`} aria-current={number === currentPage ? 'page' : undefined} onclick={() => changePage(number)}>{number}</button>
            {/each}
            <button class="focus-visible:ring-0 pagination-button" disabled={currentPage === pageCount} onclick={() => changePage(currentPage + 1)}>Next</button>
          </nav>
        </div>
      </section>
      <p class="text-xs text-zinc-500 leading-relaxed">One project per application. Open a project to select tests, configure environments and accounts, and review results.</p>
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


<SlidePanel bind:open={showDetails} title={detailsMode === 'edit' ? 'Edit project details' : 'Project details'}>
  {#if detailsProject}
    {#if detailsMode === 'view'}
      <div class="p-6 space-y-6">
        <dl class="space-y-4 text-sm">
          {#each [{ label: 'Project name', value: detailsProject.name }, { label: 'Description', value: detailsProject.description || 'No description added.' }, { label: 'Production URL', value: detailsProject.baseUrl || 'Not configured' }, { label: 'Created', value: projectDate(detailsProject.createdAt) }, { label: 'Last updated', value: projectDate(detailsProject.updatedAt) }, { label: 'Runs', value: String(detailsProject.runCount) }, { label: 'Status', value: detailsProject.archivedAt ? 'Archived' : 'Active' }] as field}
            <div><dt class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{field.label}</dt><dd class="break-words whitespace-pre-wrap">{field.value}</dd></div>
          {/each}
        </dl>
        <div class="flex flex-wrap gap-2"><Button variant="secondary" disabled={!!detailsProject.archivedAt} onclick={() => { detailsMode = 'edit' }}>Edit details</Button><a class="action-link primary" href={`/projects/${detailsProject.id}`}>Open project</a></div>
      </div>
    {:else}
      <form class="p-6 space-y-4" onsubmit={(event) => { event.preventDefault(); saveDetails() }}>
        <Input label="Project name" bind:value={editName} required disabled={savingDetails} />
        <Input label="Production URL" type="url" bind:value={editUrl} disabled={savingDetails} hint="Staging and local environments are configured in the suite workspace." />
        <Input label="Description" bind:value={editDescription} disabled={savingDetails} />
        {#if detailsError}<p class="error-banner" role="alert">{detailsError}</p>{/if}
        <div class="flex gap-2 pt-2"><Button type="submit" loading={savingDetails} disabled={!editName.trim()}>Save changes</Button><Button variant="secondary" disabled={savingDetails} onclick={closeDetails}>Cancel</Button></div>
      </form>
    {/if}
  {/if}
</SlidePanel>

<style>
  .pagination-button {
    min-width: 2rem; height: 2rem; padding: 0 0.625rem; border-radius: 0.5rem;
    font-size: 0.75rem; color: var(--color-zinc-600); transition: background-color 150ms;
  }
  .pagination-button:hover:not(:disabled), .pagination-current { background: var(--color-zinc-100); color: var(--color-zinc-900); }
  .pagination-current { font-weight: 600; }
  .pagination-button:disabled { opacity: 0.35; cursor: default; }
  .pagination-button:focus-visible { outline: 1px solid var(--color-zinc-400); outline-offset: 2px; }
  :global(.dark) .pagination-button { color: var(--color-zinc-400); }
  :global(.dark) .pagination-button:hover:not(:disabled), :global(.dark) .pagination-current { background: var(--color-zinc-800); color: var(--color-zinc-100); }
</style>
