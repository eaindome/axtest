<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import ProjectNavigation from '$lib/components/layout/ProjectNavigation.svelte'
  import { api } from '$lib/api'
  import type { Project, ProjectEnvironment, TestFile, TestAccount, EnvironmentName, RunDetail } from '$lib/api/types'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { useMock, modeKey } from '$lib/stores/dev'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { discoverSuites, selectedInputNames, normalizedUrl } from '$lib/suites'
  import { resolveEffectiveUrl } from '$lib/editor/resolve-env-url'
  import Button from '$lib/components/ui/Button.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import RunEvidence from '$lib/components/editor/RunEvidence.svelte'

  let mounted = $state(false), loading = $state(true), submitting = $state(false), error = $state('')
  let projects = $state<Project[]>([]), project = $state<Project | null>(null), files = $state<TestFile[]>([])
  let environments = $state<ProjectEnvironment[]>([]), accounts = $state<TestAccount[]>([])
  let environment = $state<EnvironmentName>('production'), accountId = $state(''), query = $state(''), activeSuite = $state('')
  let selection = $state<Record<string, string[]>>({}), results = $state<RunDetail[]>([]), accountChoices = $state<Record<string, string>>({})
  let context = $state<{ mode: string; environment: string; account: string; url: string } | null>(null)
  let defaultAccounts = $state<Record<string, string | null>>({})
  let generation = 0, pollGeneration = 0
  let pollingError = $state(false)
  const suites = $derived(discoverSuites(files))
  const filtered = $derived(suites.filter(file => `${file.path} ${file.parsed.tests.map(test => test.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())))
  const active = $derived(suites.find(file => file.id === activeSuite))
  const chosen = $derived(suites.map(file => ({ file, names: file.parsed.tests.filter(test => (selection[file.id] ?? []).includes(test.name)).map(test => test.name) })).filter(entry => entry.names.length))
  const count = $derived(chosen.reduce((total, entry) => total + entry.names.length, 0))
  const required = $derived(selectedInputNames(files, selection))
  const targetUrl = $derived(resolveEffectiveUrl(environment, project, environments))
  const availableAccounts = $derived(accounts.filter(account => account.environment === environment && account.targetUrl === normalizedUrl(targetUrl)))
  const account = $derived(availableAccounts.find(account => account.id === accountId))
  const missing = $derived(required.filter(name => !account?.variableNames.includes(name)))
  const configured = $derived(!!targetUrl && (environment === 'production' || environments.some(env => env.name === environment && env.configured)))
  const busy = $derived(submitting || results.some(run => run.status === 'pending' || run.status === 'running'))
  const passed = $derived(results.reduce((total, run) => total + run.passedTests, 0))
  const failed = $derived(results.reduce((total, run) => total + run.failedTests, 0))
  const total = $derived(results.reduce((total, run) => total + run.totalTests, 0))
  const control = 'h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
  function preferenceKey(id: number | string | undefined = project?.id) { return modeKey(`suites:${$authStore.user?.id}:${$currentWorkspace?.id}:${id}`) }
  function persist() {
    if (!project) return
    localStorage.setItem(preferenceKey(), JSON.stringify({ environment, accountId, accountChoices: { ...accountChoices, [environment]: accountId }, selection, activeSuite, runIds: results.map(run => run.id), context }))
    localStorage.setItem(preferenceKey('project'), String(project.id))
  }
  function readPreferences(id: number) { try { return JSON.parse(localStorage.getItem(preferenceKey(id)) ?? '{}') } catch { return {} } }
  onMount(() => { mounted = true })
  onDestroy(() => { generation++; pollGeneration++ })
  $effect(() => {
    pageTitle.set(project?.name ?? 'Project'); pageSubtitle.set('Test suites'); pageAction.set(null)
    return () => { pageTitle.set(''); pageSubtitle.set('') }
  })
  $effect(() => {
    const workspace = $currentWorkspace
    const id = Number($page.params.id)
    if (mounted && workspace) untrack(() => void loadWorkspace(workspace.id, id))
  })

  async function loadWorkspace(workspaceId: number, projectId: number) {
    const version = ++generation; pollGeneration++; loading = true; error = ''; results = []; project = null; projects = []; files = []; accounts = []; environments = []; selection = {}
    try {
      const list = await api().getProjects(workspaceId)
      if (version !== generation) return
      projects = list
      const next = list.find(project => project.id === projectId)
      if (next) await selectProject(next.id)
      else error = 'This project is not available in the current workspace. Open Projects to choose an application.'
    } catch (reason) { error = message(reason) }
    finally { if (version === generation) loading = false }
  }
  async function selectProject(id: number) {
    const version = ++generation; pollGeneration++; loading = true; error = ''; results = []; context = null
    project = projects.find(project => project.id === id) ?? null
    if (!project) { loading = false; return }
    try {
      const [explorer, envs, savedAccounts, ...settings] = await Promise.all([api().getExplorer(id), api().getEnvironments(id), api().getTestAccounts(id), ...(['production', 'staging', 'local'] as EnvironmentName[]).map(name => api().getProjectSetup(id, name))])
      if (version !== generation) return
      files = explorer.files; environments = envs; accounts = savedAccounts; defaultAccounts = Object.fromEntries(settings.map(setup => [setup.environment, setup.defaultAccountId]))
      const preferences = readPreferences(id)
      environment = ['production', 'staging', 'local'].includes(preferences.environment) ? preferences.environment : 'production'
      accountId = typeof preferences.accountId === 'string' && preferences.accountId ? preferences.accountId : defaultAccounts[environment] ?? ''
      accountChoices = preferences.accountChoices && typeof preferences.accountChoices === 'object' && Object.values(preferences.accountChoices).every(value => typeof value === 'string') ? preferences.accountChoices : {}
      selection = preferences.selection && typeof preferences.selection === 'object' && Object.values(preferences.selection).every(value => Array.isArray(value) && value.every(name => typeof name === 'string')) ? preferences.selection : {}
      activeSuite = suites.some(file => file.id === preferences.activeSuite) ? preferences.activeSuite : suites[0]?.id ?? ''
      context = preferences.context && typeof preferences.context === 'object' ? preferences.context : null
      if (accountId && !availableAccounts.some(account => account.id === accountId)) accountId = ''
      else if (!accountId && typeof preferences.accountId !== 'string') accountId = availableAccounts[0]?.id ?? ''
      if (Array.isArray(preferences.runIds) && preferences.runIds.length && preferences.runIds.length <= 30) void follow(preferences.runIds.filter((id: unknown) => Number.isSafeInteger(id)))
      else persist()
    } catch (reason) { if (version === generation) error = message(reason) }
    finally { if (version === generation) loading = false }
  }
  function message(reason: unknown) { return reason instanceof Error ? reason.message : 'Something went wrong. Please try again.' }
  function toggleSuite(id: string) {
    const file = suites.find(file => file.id === id)!
    const names = file.parsed.tests.map(test => test.name)
    selection = { ...selection, [id]: names.every(name => (selection[id] ?? []).includes(name)) ? [] : names }; activeSuite = id; persist()
  }
  function toggleTest(id: string, name: string) { const names = selection[id] ?? []; selection = { ...selection, [id]: names.includes(name) ? names.filter(value => value !== name) : [...names, name] }; persist() }
  function selectAll(clear = false) { selection = clear ? {} : Object.fromEntries(suites.map(file => [file.id, file.parsed.tests.map(test => test.name)])); persist() }
  function changeEnvironment(value: string) { accountChoices = { ...accountChoices, [environment]: accountId }; environment = value as EnvironmentName; const previous = accountChoices[environment]; accountId = typeof previous === 'string' ? (availableAccounts.some(account => account.id === previous) ? previous : '') : defaultAccounts[environment] && availableAccounts.some(account => account.id === defaultAccounts[environment]) ? defaultAccounts[environment]! : availableAccounts[0]?.id ?? ''; persist() }
  function openSetup() { if (project) { persist(); void goto(`/projects/${project.id}`) } }
  async function launch(mode: 'run' | 'watch', failedOnly = false) {
    if (!project || project.archivedAt || busy) return
    if (failedOnly) { selection = Object.fromEntries(results.map(run => [files.find(file => file.path === run.suiteName)?.id ?? '', run.results.filter(result => result.status === 'failed').map(result => result.testName)]).filter(([id]) => id)); persist() }
    if (!configured || missing.length) { persist(); void goto(`/projects/${project.id}?needs=${!configured ? 'environment' : 'account'}&inputs=${encodeURIComponent(missing.join(', '))}`); return }
    const choices = failedOnly ? results.map(run => ({ file: files.find(file => file.path === run.suiteName), names: run.results.filter(result => result.status === 'failed').map(result => result.testName) })).filter(entry => entry.file && entry.names.length) : chosen
    if (!choices.length) return
    submitting = true; error = ''
    try {
      const runs = await api().runSuites(project.id, { environment, files: choices.map(entry => ({ fileId: entry.file!.id, testNames: entry.names })), accountId: account?.id, headed: mode === 'watch' })
      results = runs.map(run => ({ ...run, results: [] })); context = { mode, environment, account: account?.name ?? 'No account', url: targetUrl }; persist()
      void follow(runs.map(run => run.id))
    } catch (reason) { error = message(reason) } finally { submitting = false }
  }
  async function follow(ids: number[]) {
    const version = ++pollGeneration, id = project!.id
    pollingError = false
    try {
      while (version === pollGeneration) {
        const runs = await Promise.all(ids.map(runId => api().getRun(id, runId)))
        if (version !== pollGeneration) return
        results = runs; persist()
        if (runs.every(run => run.status === 'passed' || run.status === 'failed')) return
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (reason) { if (version === pollGeneration) { pollingError = true; error = `Could not refresh results. Your submitted runs continue on the API. ${message(reason)}` } }
  }
</script>

<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950"><div class="page-shell space-y-6">
  <ProjectNavigation projectId={Number($page.params.id)} name={project?.name} active="suites" />
  <div class="flex flex-wrap items-start justify-between gap-4"><div><p class="eyebrow mb-2">Testing workspace</p><h1 class="page-heading">Test suites</h1><p class="page-description">Choose tests, run them together, and inspect the results here.</p></div>{#if project}<a class="action-link" href={`/editor?project=${project.id}`}>Open editor</a>{/if}</div>
  {#if project?.archivedAt}<p class="error-banner">This project is archived. Restore it from Projects to start new runs.</p>{/if}
  {#if error}<div class="error-banner" role="alert">{error}{#if pollingError}<button class="ml-3 underline font-medium" onclick={() => { error = ''; void follow(results.map(run => run.id)) }}>Refresh results</button>{/if}</div>{/if}
  {#if !loading && !projects.length}<section class="surface p-10 text-center"><h2 class="section-heading">Start with an application</h2><p class="page-description mb-5">Create a project, then add its tests in the editor.</p><a href="/projects" class="action-link primary">Open projects</a></section>
  {:else}
  <section class="surface p-5 space-y-4" aria-label="Run configuration">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2"><span class="text-xs font-medium text-zinc-500">Environment</span><DropdownMenu class="w-full" label="Environment" value={environment} disabled={busy || loading} options={[{ value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }, { value: 'local', label: 'Local' }]} onchange={changeEnvironment} /></div>
      <div class="space-y-2"><span class="text-xs font-medium text-zinc-500">Test account</span><DropdownMenu class="w-full" label="Test account" value={accountId} disabled={busy || loading} options={[{ value: '', label: required.length ? 'Select a saved account' : 'No account required' }, ...availableAccounts.map(account => ({ value: account.id, label: account.name }))]} onchange={value => { accountId = value; persist() }} /></div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3"><div class="min-w-0"><p class="text-xs font-mono text-zinc-500 break-all">{targetUrl || 'Environment URL not configured'}</p><p class={`text-xs mt-1 ${configured && !missing.length ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>{configured && !missing.length ? 'Ready to run' : 'Setup needed'}{#if $useMock} · Mock results are simulated{/if}</p></div><Button variant="secondary" size="sm" disabled={!project || busy || loading} onclick={openSetup}>Configuration</Button></div>
  </section>
  {#if loading}<p class="p-8 text-sm text-zinc-500" role="status">Loading test suites…</p>
  {:else if project}
  <div class="grid gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
    <section class="surface p-4 self-start" aria-label="Suite selection">
      <div class="flex justify-between items-center mb-4"><h2 class="section-heading">Suites <span class="text-zinc-400 font-normal">{suites.length}</span></h2><div class="flex gap-3 text-xs"><button onclick={() => selectAll()} disabled={busy} class="text-amber-700 dark:text-amber-400">Select all</button><button onclick={() => selectAll(true)} disabled={busy} class="text-zinc-500">Clear</button></div></div>
      <input class={`${control} w-full mb-4`} type="search" aria-label="Search suites" placeholder="Find a suite or test…" bind:value={query} />
      {#if !suites.length}<p class="text-sm text-zinc-500 py-5">No test suites yet. Add a file containing TEST cases in the editor. Reusable authentication flows appear within the tests that use them.</p>{/if}
      <div class="space-y-2">{#each filtered as file}<div class={`flex items-start gap-3 rounded-lg border p-3 ${activeSuite === file.id ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/20' : 'border-zinc-200 dark:border-zinc-800'}`}><input class="mt-1 accent-amber-700" type="checkbox" aria-label={`Select suite ${file.path}`} checked={file.parsed.tests.every(test => (selection[file.id] ?? []).includes(test.name))} disabled={busy} onchange={() => toggleSuite(file.id)} /><button class="min-w-0 flex-1 text-left" onclick={() => { activeSuite = file.id; persist() }}><p class="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-all">{file.path}</p><p class="text-xs mt-1 text-zinc-500">{(selection[file.id] ?? []).length}/{file.parsed.tests.length} selected</p></button></div>{/each}</div>
    </section>
    <div class="space-y-5 min-w-0">
      <section class="surface overflow-hidden" aria-label="Tests in suite"><div class="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3"><div><h2 class="section-heading">{active?.path ?? 'Choose a suite'}</h2>{#if active?.parsed.auth}<p class="mt-1 text-xs text-zinc-500">Signs in with {active.parsed.auth}</p>{/if}</div>{#if active}<a class="text-xs font-medium text-amber-700 dark:text-amber-400" href={`/editor?project=${project.id}&file=${encodeURIComponent(active.path)}`}>Edit suite</a>{/if}</div>
        {#if active}{#each active.parsed.tests as test}<label class="flex items-start gap-3 px-5 py-4 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"><input class="mt-1 accent-amber-700" type="checkbox" checked={(selection[active.id] ?? []).includes(test.name)} disabled={busy} onchange={() => toggleTest(active!.id, test.name)} /><span><span class="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{test.name}</span><span class="block text-xs text-zinc-500 mt-1">{test.steps.length} actions · {test.asserts.length} checks{test.dependsOn ? ` · Depends on ${test.dependsOn}` : ''}</span></span></label>{/each}{/if}
      </section>
      <section class="surface p-5" aria-label="Execution controls"><div class="flex flex-wrap items-center justify-between gap-4"><div><p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{count} test{count === 1 ? '' : 's'} selected</p><p class="text-xs text-zinc-500 mt-1">Dependencies are included automatically. Submitted runs continue if you leave this page.</p></div><div class="flex flex-wrap gap-2"><Button onclick={() => launch('run')} disabled={!count || busy || !!project.archivedAt} loading={submitting}>Run selected</Button><Button variant="secondary" onclick={() => launch('watch')} disabled={!count || busy || $useMock || !!project.archivedAt}>Watch selected</Button><button class="action-link opacity-50" disabled title="Breakpoints and stepping are planned for the debugger stage.">Debug</button></div></div><p class="text-xs text-zinc-500 mt-3">Run executes in the background. Watch opens Chromium on the API computer. Debug controls are coming next.</p></section>
      <section class="surface overflow-hidden" aria-label="Suite results"><div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3"><div><h2 class="section-heading">Results{#if results.length}<span class="ml-2 text-sm font-normal" role="status">{passed}/{total} passed{busy ? ' · Running…' : ''}</span>{/if}</h2>{#if context}<p class="text-xs text-zinc-500 mt-1">{context.mode === 'watch' ? 'Watch' : 'Run'} · {context.environment} · {context.account}</p>{/if}</div>{#if failed && !busy && !project.archivedAt}<Button variant="secondary" size="sm" onclick={() => launch('run', true)}>Rerun failed</Button>{/if}</div>
        {#if !results.length}<p class="text-sm text-zinc-500 p-6">Select tests and run them. Results and failure evidence will appear here.</p>{/if}
        {#each results as run}<div class="p-5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"><div class="flex flex-wrap justify-between gap-2 text-sm"><h3 class="font-semibold break-all text-zinc-800 dark:text-zinc-200">{run.suiteName}</h3><span class={run.status === 'failed' ? 'text-red-600' : run.status === 'passed' ? 'text-green-700 dark:text-green-400' : 'text-zinc-500'}>{run.status} · {run.passedTests}/{run.totalTests} passed</span></div>{#if run.errorMessage}<p class="error-banner mt-3" role="alert">{run.errorMessage}</p>{/if}{#each run.results as result}<details class="mt-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" open={result.status === 'failed'}><summary class="cursor-pointer text-sm text-zinc-800 dark:text-zinc-200"><span class="font-medium">{result.testName}</span><span class="ml-2 text-xs text-zinc-500">{result.status} · {result.durationMs}ms</span></summary>{#if result.errorMessage}<p class="mt-3 text-sm text-red-600 break-words">{result.errorMessage}</p>{/if}<RunEvidence {result} /></details>{/each}</div>{/each}
        {#if results.length}<div class="p-4"><a class="text-xs text-amber-700 dark:text-amber-400 font-medium" href={`/projects/${project.id}/history`}>Open project run history</a></div>{/if}
      </section>
    </div>
  </div>
  {/if}{/if}
</div></div>

