<script lang="ts">
  import { onMount, onDestroy, untrack, tick } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import ProjectNavigation from '$lib/components/layout/ProjectNavigation.svelte'
  import { api } from '$lib/api'
  import type { Project, ProjectEnvironment, TestFile, TestAccount, EnvironmentName, RunDetail } from '$lib/api/types'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { useMock, modeKey } from '$lib/stores/dev'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { discoverSuites, selectedInputNames, selectedExecution, suiteLabel, normalizedUrl } from '$lib/suites'
  import { resolveEffectiveUrl } from '$lib/editor/resolve-env-url'
  import Button from '$lib/components/ui/Button.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import RunEvidence from '$lib/components/editor/RunEvidence.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import { toast } from '$lib/stores/toasts'
  import { suitePreferenceKey, readSuitePreferences, saveSuiteContext } from '$lib/suite-context'
  import { parseAssertion } from '$lib/editor/parse-assertion'

  let mounted = $state(false), loading = $state(true), submitting = $state(false), error = $state('')
  let projects = $state<Project[]>([]), project = $state<Project | null>(null), files = $state<TestFile[]>([])
  let environments = $state<ProjectEnvironment[]>([]), accounts = $state<TestAccount[]>([])
  let environment = $state<EnvironmentName>('production'), accountId = $state(''), query = $state(''), activeSuite = $state('')
  let selection = $state<Record<string, string[]>>({}), results = $state<RunDetail[]>([]), accountChoices = $state<Record<string, string>>({})
  let context = $state<{ mode: string; environment: string; account: string; url: string } | null>(null)
  let defaultAccounts = $state<Record<string, string | null>>({})
  let generation = 0, pollGeneration = 0
  let pollingError = $state(false)
  let viewport = $state<HTMLDivElement>()
  let inputsOpen = $state(false), runValues = $state<Record<string, string>>({})

  const suites = $derived(discoverSuites(files))
  const filtered = $derived(suites.map(file => {
    const term = query.trim().toLowerCase(), wholeSuite = `${suiteLabel(file)} ${file.path}`.toLowerCase().includes(term)
    return { ...file, visibleTests: wholeSuite ? file.parsed.tests : file.parsed.tests.filter(test => test.name.toLowerCase().includes(term)) }
  }).filter(file => !query.trim() || `${suiteLabel(file)} ${file.path}`.toLowerCase().includes(query.trim().toLowerCase()) || file.visibleTests.length))
  const active = $derived(suites.find(file => file.id === activeSuite))
  const chosen = $derived(suites.map(file => ({ file, names: file.parsed.tests.filter(test => (selection[file.id] ?? []).includes(test.name)).map(test => test.name) })).filter(entry => entry.names.length))
  const count = $derived(chosen.reduce((total, entry) => total + entry.names.length, 0))
  const execution = $derived(selectedExecution(files, selection))
  const required = $derived(selectedInputNames(files, selection))
  const visibleNames = $derived(Object.fromEntries(filtered.map(file => [file.id, file.visibleTests.map(test => test.name)])))
  const visibleCount = $derived(filtered.reduce((sum, file) => sum + file.visibleTests.length, 0))
  const allVisibleSelected = $derived(visibleCount > 0 && filtered.every(file => file.visibleTests.every(test => (selection[file.id] ?? []).includes(test.name))))
  const hiddenCount = $derived(chosen.reduce((sum, entry) => sum + entry.names.filter(name => !visibleNames[entry.file.id]?.includes(name)).length, 0))
  const activeTests = $derived(filtered.find(file => file.id === activeSuite)?.visibleTests ?? [])

  const targetUrl = $derived(resolveEffectiveUrl(environment, project, environments))
  const availableAccounts = $derived(accounts.filter(account => account.environment === environment && account.targetUrl === normalizedUrl(targetUrl)))
  const account = $derived(availableAccounts.find(account => account.id === accountId))
  const missing = $derived(required.filter(name => !account?.variableNames.includes(name) && !runValues[name]?.trim()))
  const missingCredentials = $derived(missing.filter(name => /USERNAME|PASSWORD|TOKEN|SECRET|KEY/.test(name)))
  const runInputNames = $derived(required.filter(name => !account?.variableNames.includes(name) && !/USERNAME|PASSWORD|TOKEN|SECRET|KEY/.test(name)))
  const missingData = $derived(missing.filter(name => !missingCredentials.includes(name)))
  const configured = $derived(!!targetUrl && (environment === 'production' || environments.some(env => env.name === environment && env.configured)))
  const busy = $derived(submitting || results.some(run => run.status === 'pending' || run.status === 'running'))
  const passed = $derived(results.reduce((total, run) => total + run.passedTests, 0))
  const failed = $derived(results.reduce((total, run) => total + run.failedTests, 0))
  const total = $derived(results.reduce((total, run) => total + run.totalTests, 0))
  const readiness = $derived(count ? [...(!configured ? ['Save an address for this environment in Configuration.'] : []), ...(missingCredentials.length ? [`Choose a saved account providing: ${missingCredentials.join(', ')}.`] : []), ...(missingData.length ? [`Provide run inputs: ${missingData.join(', ')}.`] : []), ...execution.errors, ...execution.entries.filter(entry => entry.tests.length > 500).map(entry => `${suiteLabel(entry.file)} exceeds the limit of 500 tests per run.`)] : [])
  const control = 'h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400/40 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
  function preferenceKey(id: number | string | undefined = project?.id) { return suitePreferenceKey($authStore.user?.id, $currentWorkspace?.id, id) }
  function persist() {
    if (!project) return
    saveSuiteContext(preferenceKey(), { query, scrollTop: viewport?.scrollTop ?? 0, environment, accountId, accountChoices: { ...accountChoices, [environment]: accountId }, selection, activeSuite, runIds: results.map(run => run.id), context })
    localStorage.setItem(preferenceKey('project'), String(project.id))
  }
  function readPreferences(id: number) { return readSuitePreferences(preferenceKey(id)) }
  onMount(() => { mounted = true })
  onDestroy(() => { generation++; pollGeneration++; runValues = {} })
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
    const version = ++generation; pollGeneration++; loading = true; error = ''; results = []; project = null; projects = []; files = []; accounts = []; environments = []; selection = {}; runValues = {}
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
      query = typeof preferences.query === 'string' ? preferences.query : ''
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
      loading = false
      await tick()
      if (version === generation && viewport) viewport.scrollTop = Number.isFinite(preferences.scrollTop) ? preferences.scrollTop : 0
    } catch (reason) { if (version === generation) error = message(reason) }
    finally { if (version === generation) loading = false }
  }
  function message(reason: unknown) { return reason instanceof Error ? reason.message : 'Something went wrong. Please try again.' }
  function toggleSuite(id: string) {
    const names = visibleNames[id] ?? []
    if (!names.length) return
    const previous = selection[id] ?? [], all = names.every(name => previous.includes(name))
    selection = { ...selection, [id]: all ? previous.filter(name => !names.includes(name)) : [...new Set([...previous, ...names])] }; persist()
  }
  function toggleTest(id: string, name: string) { const names = selection[id] ?? []; selection = { ...selection, [id]: names.includes(name) ? names.filter(value => value !== name) : [...names, name] }; persist() }
  function selectVisible() {
    const next = { ...selection }
    for (const file of filtered) { const previous = next[file.id] ?? [], names = file.visibleTests.map(test => test.name); next[file.id] = allVisibleSelected ? previous.filter(name => !names.includes(name)) : [...new Set([...previous, ...names])] }
    selection = next; persist()
  }
  function search(value: string) { query = value; if (!filtered.some(file => file.id === activeSuite)) activeSuite = filtered[0]?.id ?? ''; persist() }
  function mixed(node: HTMLInputElement, value: boolean) { node.indeterminate = value; return { update(next: boolean) { node.indeterminate = next } } }
  function openEditor(file?: TestFile, test?: string, add = false) {
    if (!project) return
    persist()
    const params = new URLSearchParams({ project: String(project.id) })
    if (file) params.set('file', file.path)
    else params.set('newSuite', '1')
    if (test) params.set('test', test)
    if (add) params.set('addTest', '1')
    void goto(`/editor?${params}`)
  }
  function actionText(step: { type: string; target: string; value: string }) {
    const target = step.target.replace(/^"|"$/g, '')
    return step.type === 'navigate' ? `Open ${target}` : step.type === 'type' ? `Enter ${step.value} in ${target}` : step.type === 'click' ? `Click ${target}` : step.type === 'select' ? `Choose ${step.value} in ${target}` : step.type === 'clear' ? `Clear ${target}` : step.type === 'wait' ? `Wait for ${target} to ${step.value || 'appear'}` : step.target
  }
  function checkText(body: string) { const check = parseAssertion(body); return check.type === 'is_visible' ? `${check.target} appears` : check.type === 'is_not_visible' ? `${check.target} is hidden` : check.type === 'contains' ? `${check.target} contains ${check.value}` : check.type === 'url_contains' ? `URL contains ${check.value}` : body }
  function changeEnvironment(value: string) { accountChoices = { ...accountChoices, [environment]: accountId }; environment = value as EnvironmentName; const previous = accountChoices[environment]; accountId = typeof previous === 'string' ? (availableAccounts.some(account => account.id === previous) ? previous : '') : defaultAccounts[environment] && availableAccounts.some(account => account.id === defaultAccounts[environment]) ? defaultAccounts[environment]! : availableAccounts[0]?.id ?? ''; persist() }
  function openSetup() { if (project) { persist(); void goto(`/projects/${project.id}`) } }
  async function launch(mode: 'run' | 'watch', failedOnly = false) {
    if (!project || project.archivedAt || busy) return
    if (failedOnly) { selection = Object.fromEntries(results.map(run => [files.find(file => file.path === run.suiteName)?.id ?? '', run.results.filter(result => result.status === 'failed').map(result => result.testName)]).filter(([id]) => id)); persist() }
    if (readiness.length) return
    const choices = failedOnly ? results.map(run => ({ file: files.find(file => file.path === run.suiteName), names: run.results.filter(result => result.status === 'failed').map(result => result.testName) })).filter(entry => entry.file && entry.names.length) : chosen
    if (!choices.length) return
    submitting = true; error = ''
    try {
      const runs = await api().runSuites(project.id, { environment, files: choices.map(entry => ({ fileId: entry.file!.id, testNames: entry.names })), accountId: account?.id, headed: mode === 'watch', variables: Object.fromEntries(Object.entries(runValues).filter(([name, value]) => required.includes(name) && value.trim())) })
      results = runs.map(run => ({ ...run, results: [] })); context = { mode, environment, account: account?.name ?? 'No account', url: targetUrl }; persist()
      void follow(runs.map(run => run.id))
    } catch (reason) { toast(message(reason), 'error') } finally { submitting = false }
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

<div bind:this={viewport} class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950"><div class="page-shell space-y-6">
  <ProjectNavigation projectId={Number($page.params.id)} name={project?.name} active="suites" />
  <div class="flex flex-wrap items-start justify-between gap-4"><div><p class="eyebrow mb-2">Behaviour testing</p><h1 class="page-heading">Test suites</h1><p class="page-description">Organise user journeys, choose what to test, and see what needs attention.</p></div>{#if project}<div class="flex gap-2"><Button variant="secondary" onclick={() => openEditor(active)}>Open editor</Button><Button disabled={busy || loading || !!project.archivedAt} onclick={() => openEditor()}>New suite</Button></div>{/if}</div>
  {#if project?.archivedAt}<p class="error-banner">This project is archived. Restore it from Projects to create tests or start new runs.</p>{/if}
  {#if error}<div class="error-banner" role="alert">{error}{#if pollingError}<button class="ml-3 underline font-medium" onclick={() => { error = ''; void follow(results.map(run => run.id)) }}>Refresh results</button>{/if}</div>{/if}
  {#if loading}<p class="surface p-8 text-sm text-zinc-500" role="status">Loading test suites…</p>
  {:else if project}
    <section class="surface p-4 space-y-4" aria-label="Execution controls">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
        <div class="space-y-2"><span class="text-xs font-medium text-zinc-500">Environment</span><DropdownMenu class="w-full" label="Environment" value={environment} disabled={busy} options={[{ value: 'local', label: 'Local' }, { value: 'staging', label: 'Staging' }, { value: 'production', label: 'Production' }]} onchange={changeEnvironment} /></div>
        <div class="space-y-2"><span class="text-xs font-medium text-zinc-500">Test account</span><DropdownMenu class="w-full" label="Test account" value={accountId} disabled={busy} options={[{ value: '', label: required.some(name => /USERNAME|PASSWORD|TOKEN|SECRET|KEY/.test(name)) ? 'Choose a saved account' : 'No account required' }, ...availableAccounts.map(account => ({ value: account.id, label: account.name }))]} onchange={value => { accountId = value; persist() }} /></div>
        <Button onclick={() => launch('run')} disabled={!count || busy || !!project.archivedAt || !!readiness.length} loading={submitting}>Run selected</Button>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{count} selected{#if execution.included.length} · {execution.included.length} prerequisites included{/if} · {execution.count} will run</p><p class="text-xs text-zinc-500 break-all mt-1">{targetUrl || 'No address configured'}{#if environment === 'production'} · Production target{/if}{#if $useMock} · Simulated results in mock mode{/if}</p></div><div class="flex gap-3 text-xs font-medium">{#if runInputNames.length}<button disabled={busy} class="text-amber-700 dark:text-amber-400" onclick={() => { inputsOpen = true }}>Run inputs</button>{/if}<button disabled={busy} class="text-zinc-500" onclick={openSetup}>Configuration</button></div></div>
      {#if !count}<p class="text-xs text-zinc-500">Open a suite to inspect it. Use checkboxes to include tests in a run.</p>{:else if readiness.length}<div class="rounded-lg border border-amber-200 dark:border-amber-900 p-3 space-y-2" role="status"><p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Before this selection can run</p><ul class="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">{#each readiness as reason}<li>{reason}</li>{/each}</ul><div class="flex flex-wrap gap-3 text-xs font-medium">{#if !configured || missingCredentials.length}<a class="text-amber-700 dark:text-amber-400" onclick={persist} href={`/projects/${project.id}?needs=${!configured ? 'environment' : 'account'}&inputs=${encodeURIComponent(missingCredentials.join(', '))}`}>Configure access</a>{/if}{#if missingData.length}<button class="text-amber-700 dark:text-amber-400" onclick={() => { inputsOpen = true }}>Provide run inputs</button>{/if}</div></div>{:else}<p class="text-xs text-emerald-700 dark:text-emerald-400">Ready to run this selection.</p>{/if}
      {#if execution.entries.length}<details class="text-xs text-zinc-500"><summary class="cursor-pointer font-medium">Execution plan · {execution.count} tests</summary><ul class="mt-3 space-y-2">{#each execution.entries as entry}{#each entry.tests as test}<li>{suiteLabel(entry.file)} · {test.name}{#if entry.included.some(item => item.name === test.name)} <span class="text-amber-700 dark:text-amber-400">(included prerequisite)</span>{/if}</li>{/each}{/each}</ul></details>{/if}
    </section>
    {#if !suites.length}<section class="surface p-10 text-center"><h2 class="section-heading">Start with a user journey</h2><p class="page-description mb-5">Create a suite such as Task management, then describe what a user should be able to do.</p><Button disabled={!!project.archivedAt} onclick={() => openEditor()}>Create your first suite</Button></section>
    {:else}
    <div class="grid gap-5 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] items-start">
      <section class="surface p-4 space-y-4" aria-label="Suite selection">
        <div class="flex items-center justify-between"><h2 class="section-heading">Suites <span class="font-normal text-zinc-400">{suites.length}</span></h2><button class="text-xs text-zinc-500" disabled={busy || !count} onclick={() => { selection = {}; persist() }}>Clear selection</button></div>
        <input class={`${control} w-full`} type="search" aria-label="Search suites" placeholder="Find a suite or behaviour" value={query} oninput={event => search(event.currentTarget.value)} />
        <div class="flex items-center justify-between gap-3 text-xs"><span class="text-zinc-500">{visibleCount} visible tests</span><button class="font-medium text-amber-700 dark:text-amber-400" disabled={busy || !visibleCount} onclick={selectVisible}>{allVisibleSelected ? 'Deselect visible' : 'Select visible'}</button></div>
        {#if hiddenCount}<p class="text-xs text-amber-700 dark:text-amber-400">{hiddenCount} selected test{hiddenCount === 1 ? '' : 's'} outside this search. They will still run.</p>{/if}
        <p class="text-xs text-zinc-500">Names open suites. Checkboxes select visible tests.</p>
        {#each filtered as file}<div class="flex items-start gap-3 rounded-lg border p-3 {activeSuite === file.id ? 'border-amber-600 bg-amber-50/30 dark:bg-amber-950/20' : 'border-zinc-200 dark:border-zinc-800'}"><input type="checkbox" class="mt-1 accent-amber-700" aria-label={`Select suite ${suiteLabel(file)}`} use:mixed={file.visibleTests.some(test => (selection[file.id] ?? []).includes(test.name)) && !file.visibleTests.every(test => (selection[file.id] ?? []).includes(test.name))} checked={file.visibleTests.length > 0 && file.visibleTests.every(test => (selection[file.id] ?? []).includes(test.name))} disabled={busy || !file.visibleTests.length} onchange={() => toggleSuite(file.id)} /><button class="min-w-0 flex-1 text-left" aria-label={`Open suite ${suiteLabel(file)}`} aria-current={activeSuite === file.id ? 'true' : undefined} onclick={() => { activeSuite = file.id; persist() }}><p class="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words">{suiteLabel(file)}</p><p class="text-xs text-zinc-500 mt-1">{file.parsed.tests.length} tests · {(selection[file.id] ?? []).length} selected</p></button></div>{:else}<p class="text-sm text-zinc-500 py-5">No suites or behaviours match this search.</p>{/each}
      </section>
      <div class="space-y-5 min-w-0">
        <section class="surface overflow-hidden" aria-label="Tests in suite"><div class="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3"><div><h2 class="section-heading">{active ? suiteLabel(active) : 'Choose a suite'}</h2>{#if active}<p class="text-xs text-zinc-500 mt-1">{active.parsed.auth ? `Uses login flow ${active.parsed.auth}` : 'No reusable login step'}</p>{/if}</div>{#if active}<Button size="sm" variant="secondary" disabled={busy || !!project.archivedAt} onclick={() => openEditor(active, undefined, true)}>Add test</Button>{/if}</div>
          {#if active && !active.parsed.tests.length}<div class="p-6 space-y-3"><p class="text-sm text-zinc-500">What should a user be able to do? Add the first behaviour and its expected result.</p><Button disabled={!!project.archivedAt} onclick={() => openEditor(active, undefined, true)}>Add your first test</Button></div>
          {:else}{#each activeTests as test}<div class="flex items-start gap-3 p-5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"><input type="checkbox" class="mt-1 accent-amber-700" aria-label={test.name} checked={(selection[active!.id] ?? []).includes(test.name)} disabled={busy} onchange={() => toggleTest(active!.id, test.name)} /><details class="min-w-0 flex-1"><summary class="cursor-pointer"><span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{test.name}</span><span class="block text-xs text-zinc-500 mt-1">{test.steps.length} actions · {test.asserts.length} expected results{test.dependsOn ? ' · Has a prerequisite' : ''}</span></summary><div class="mt-4 space-y-3 text-xs text-zinc-500"><div><p class="font-semibold mb-2">Actions</p><ol class="space-y-1">{#each test.steps as step}<li>{actionText(step)}</li>{/each}</ol></div><div><p class="font-semibold mb-2">Expected results</p><ul class="space-y-1">{#each test.asserts as check}<li>{checkText(check.assertion)}</li>{/each}</ul></div></div></details>{#if !project.archivedAt}<button class="text-xs font-medium text-amber-700 dark:text-amber-400" disabled={busy} aria-label={`Edit test ${test.name}`} onclick={() => openEditor(active, test.name)}>Edit in editor</button>{/if}</div>{/each}{/if}
        </section>
      <section class="surface overflow-hidden" aria-label="Suite results"><div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3"><div><h2 class="section-heading">Results{#if results.length}<span class="ml-2 text-sm font-normal" role="status">{passed}/{total} passed{busy ? ' · Running…' : ''}</span>{/if}</h2>{#if context}<p class="text-xs text-zinc-500 mt-1">{context.mode === 'watch' ? 'Watch' : 'Run'} · {context.environment} · {context.account}</p>{/if}</div>{#if failed && !busy && !project.archivedAt}<Button variant="secondary" size="sm" onclick={() => launch('run', true)}>Rerun failed</Button>{/if}</div>
        {#if !results.length}<p class="text-sm text-zinc-500 p-6">Select tests and run them. Results and failure evidence will appear here.</p>{/if}
        {#each results as run}<div class="p-5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"><div class="flex flex-wrap justify-between gap-2 text-sm"><h3 class="font-semibold break-all text-zinc-800 dark:text-zinc-200">{files.find(file => file.path === run.suiteName) ? suiteLabel(files.find(file => file.path === run.suiteName)!) : run.suiteName}</h3><span class={run.status === 'failed' ? 'text-red-600' : run.status === 'passed' ? 'text-green-700 dark:text-green-400' : 'text-zinc-500'}>{run.status} · {run.passedTests}/{run.totalTests} passed</span></div>{#if run.errorMessage}<p class="error-banner mt-3" role="alert">{run.errorMessage}</p>{/if}{#each run.results as result}<details class="mt-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" open={result.status === 'failed'}><summary class="cursor-pointer text-sm text-zinc-800 dark:text-zinc-200"><span class="font-medium">{result.testName}</span><span class="ml-2 text-xs text-zinc-500">{result.status} · {result.durationMs}ms</span></summary>{#if result.errorMessage}<p class="mt-3 text-sm text-red-600 break-words">{result.errorMessage}</p>{/if}<RunEvidence {result} />{#if !project.archivedAt && files.some(file => file.path === run.suiteName)}<button class="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400" onclick={() => openEditor(files.find(file => file.path === run.suiteName), result.testName)}>Edit this test</button>{/if}</details>{/each}</div>{/each}
        {#if results.length}<div class="p-4"><a class="text-xs text-amber-700 dark:text-amber-400 font-medium" href={`/projects/${project.id}/history`}>Open project run history</a></div>{/if}
      </section>
      </div>
    </div>
    {/if}
  {:else}<section class="surface p-8"><p class="text-sm text-zinc-500">Open Projects to choose an application.</p><a class="action-link mt-4" href="/projects">Open projects</a></section>{/if}
</div></div>

<SlidePanel open={inputsOpen} title="Run inputs" onclose={() => { inputsOpen = false }}>
  <form class="p-5 space-y-4" onsubmit={event => { event.preventDefault(); inputsOpen = false }}><p class="text-sm text-zinc-500">Values apply to this browser session and are cleared on refresh. Saved account credentials are managed in Configuration.</p>{#each runInputNames as name}<Input label={name.replace(/^AXTEST_/, '').replaceAll('_', ' ')} bind:value={() => runValues[name] ?? '', value => { runValues[name] = value }} required />{/each}<Button type="submit">Use these inputs</Button></form>
</SlidePanel>
