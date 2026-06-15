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
    pageAction.set({ label: '+ New Project', onclick: () => (showPanel = true) })
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })

  async function load(workspaceId: number) {
    loading = true
    try {
      projects = await api().getProjects(workspaceId)
      globalProjects.set(projects)
    } catch {}
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

  // Simulated last-run status per project
  const lastRunStatus = ['passed', 'failed']
  const runHistory = [
    ['pass','pass','pass','fail','pass','pass','fail','pass'],
    ['pass','fail','pass','pass','fail','pass','pass','pass']
  ]

  const dotColor = (s: string) => s === 'pass' ? 'bg-green-400' : 'bg-red-400'
</script>

<!-- Project list -->
<div class="flex-1 overflow-auto">
  <div class="px-5 py-4">

    {#if loading}
      <div class="flex items-center justify-center py-16">
        <Spinner size="lg" class="text-amber-500" />
      </div>
    {:else if projects.length === 0}
      <div class="border border-zinc-200 rounded-lg py-12 text-center bg-white">
        <div class="size-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-3">
          <svg class="size-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-zinc-700">No projects yet</p>
        <p class="text-xs text-zinc-400 mt-1">Create your first project to start writing tests</p>
        <button onclick={() => (showPanel = true)} class="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700">
          Create project →
        </button>
      </div>
    {:else}
      <div class="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100 bg-white">
        {#each projects as project, i}
          <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors">

            <div class="size-7 rounded-md bg-[#f3f3f3] border border-zinc-200 flex items-center justify-center shrink-0">
              <svg class="size-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-zinc-900">{project.name}</p>
                <span class="text-xs px-1.5 py-0.5 rounded font-medium leading-none
                  {lastRunStatus[i % 2] === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                  {lastRunStatus[i % 2] === 'passed' ? 'passing' : 'failing'}
                </span>
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                {#if project.baseUrl}
                  <p class="text-xs text-zinc-400 truncate max-w-xs">{project.baseUrl}</p>
                {/if}
                <div class="flex items-center gap-0.5">
                  {#each runHistory[i % 2] as dot}
                    <div class="size-1.5 rounded-full {dotColor(dot)}"></div>
                  {/each}
                </div>
                <span class="text-xs text-zinc-400">{project.runCount} runs</span>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <a
                href="/projects/{project.id}"
                class="text-xs font-medium text-zinc-500 hover:text-zinc-800 px-2.5 py-1 rounded
                       border border-zinc-200 hover:border-zinc-300 bg-white transition-colors"
              >
                Runs
              </a>
              <a
                href="/editor?project={project.id}"
                class="text-xs font-semibold text-amber-700 hover:text-amber-800 px-2.5 py-1 rounded
                       border border-amber-200 hover:border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                Open Editor
              </a>
            </div>
          </div>
        {/each}
      </div>
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

    <div class="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">What's a project?</p>
      <p class="text-xs text-zinc-500 leading-relaxed">
        A project maps to one web application. Inside each project you'll create test suites
        that run against the base URL you specify here.
      </p>
    </div>
  </div>
</SlidePanel>
