<script lang="ts">
  import { untrack, onDestroy } from 'svelte'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import type { Project, ProjectEnvironment, TestAccount, TestFile, EnvironmentName } from '$lib/api/types'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { modeKey, useMock } from '$lib/stores/dev'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { globalProjects } from '$lib/stores/search'
  import ProjectNavigation from '$lib/components/layout/ProjectNavigation.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { discoverSuites, selectedInputNames, normalizedUrl } from '$lib/suites'
  import { resolveEffectiveUrl } from '$lib/editor/resolve-env-url'

  const projectId = $derived(Number($page.params.id))
  let project = $state<Project | null>(null), environments = $state<ProjectEnvironment[]>([]), accounts = $state<TestAccount[]>([]), files = $state<TestFile[]>([])
  let loading = $state(true), saving = $state(false), error = $state(''), message = $state('')
  let environment = $state<EnvironmentName>('production'), url = $state(''), fallback = $state(false)
  let accountName = $state(''), accountValues = $state<Record<string, string>>({})
  let version = 0
  onDestroy(() => { version++ })
  const effectiveUrl = $derived(resolveEffectiveUrl(environment, project, environments))
  const environmentReady = $derived(!!effectiveUrl && (environment === 'production' || !!environments.find(item => item.name === environment)?.configured))
  const loginFlows = $derived(files.filter(file => /^\s*AUTH\s+/m.test(file.content)))
  const hasTests = $derived(files.some(file => /^\s*TEST\s+/m.test(file.content)))
  const accountFields = $derived.by(() => {
    const selection = Object.fromEntries(discoverSuites(files).map(file => [file.id, file.parsed.tests.map(test => test.name)]))
    return Array.from(new Set(['AXTEST_USERNAME', 'AXTEST_PASSWORD', ...selectedInputNames(files, selection)]))
  })
  const readOnly = $derived(!!project?.archivedAt)
  const control = 'h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-100'
  function key() { return modeKey(`suites:${$authStore.user?.id}:${$currentWorkspace?.id}:${projectId}`) }
  function preferences() { try { return JSON.parse(localStorage.getItem(key()) ?? '{}') } catch { return {} } }
  function remember(accountId?: string) {
    const previous = preferences()
    localStorage.setItem(key(), JSON.stringify({ ...previous, environment, ...(accountId ? { accountId, accountChoices: { ...previous.accountChoices, [environment]: accountId } } : {}) }))
  }
  $effect(() => { const ws = $currentWorkspace; const id = projectId; if (ws) untrack(() => void load(ws.id, id)) })
  $effect(() => {
    pageTitle.set(project?.name ?? 'Project'); pageSubtitle.set('Configuration'); pageAction.set(null)
    return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) }
  })
  async function load(workspaceId: number, id: number) {
    const current = ++version
    loading = true; error = ''; message = ''; project = null; files = []; environments = []; accounts = []; accountValues = {}; accountName = ''
    try {
      const list = await api().getProjects(workspaceId)
      if (current !== version) return
      const selected = list.find(item => item.id === id)
      if (!selected) throw new Error('This project is not available in the current workspace.')
      project = selected; globalProjects.set(list.filter(item => !item.archivedAt))
      const [envs, saved, explorer] = await Promise.all([api().getEnvironments(id), api().getTestAccounts(id), api().getExplorer(id)])
      if (current !== version) return
      environments = envs; accounts = saved; files = explorer.files
      const preferred = preferences().environment
      chooseEnvironment(['production', 'staging', 'local'].includes(preferred) ? preferred : 'production')
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not load project configuration.' }
    finally { if (current === version) loading = false }
  }
  function chooseEnvironment(value: EnvironmentName) {
    environment = value
    const selected = environments.find(item => item.name === value)
    url = value === 'production' ? project?.baseUrl ?? '' : selected?.baseUrl ?? ''
    fallback = selected?.useProductionFallback ?? false
    accountValues = {}; accountName = ''; message = ''; error = ''; remember()
  }
  async function saveEnvironment() {
    if (!project || !$currentWorkspace || readOnly || saving) return
    const current = version, selectedId = projectId, selectedEnvironment = environment
    saving = true; error = ''; message = ''
    try {
      if (selectedEnvironment === 'production') {
        const updated = await api().updateProject($currentWorkspace.id, selectedId, { name: project.name, baseUrl: url.trim(), description: project.description ?? undefined })
        if (current !== version) return
        project = updated
      } else await api().upsertEnvironment(selectedId, selectedEnvironment, { baseUrl: url.trim(), useProductionFallback: fallback })
      const envs = await api().getEnvironments(selectedId)
      if (current !== version) return
      environments = envs; message = 'Environment saved.'; remember()
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not save this environment.' }
    finally { saving = false }
  }
  async function saveAccount() {
    if (!project || readOnly || saving) return
    const current = version
    saving = true; error = ''; message = ''
    try {
      const values = Object.fromEntries(Object.entries(accountValues).filter(([, value]) => value.length))
      const saved = await api().saveTestAccount(project.id, { name: accountName.trim(), environment, variables: values })
      if (current !== version) return
      accounts = [...accounts, saved]; accountName = ''; accountValues = {}; remember(saved.id); message = 'Test account saved and selected for this environment.'
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not save the test account.' }
    finally { saving = false; accountValues = {} }
  }
  async function removeAccount(account: TestAccount) {
    if (!project || readOnly || !confirm(`Delete the saved test account ${account.name}?`)) return
    const current = version
    saving = true; error = ''
    try {
      await api().deleteTestAccount(project.id, account.id)
      if (current !== version) return
      accounts = accounts.filter(item => item.id !== account.id); message = 'Test account deleted.'
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not delete the test account.' }
    finally { saving = false }
  }
</script>

<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950"><div class="page-shell space-y-6">
  <ProjectNavigation {projectId} name={project?.name} active="configuration" />
  <div class="flex flex-wrap justify-between items-start gap-4"><div><p class="eyebrow mb-2">Project setup</p><h1 class="page-heading">Configuration</h1><p class="page-description">Connect your application and prepare the accounts your tests will use.</p></div>{#if project && !readOnly}<a class="action-link primary" href={hasTests ? `/projects/${projectId}/suites` : `/editor?project=${projectId}`}>{hasTests ? 'Open test suites' : 'Create your first test'}</a>{/if}</div>
  {#if error}<p class="error-banner" role="alert">{error}</p>{/if}
  {#if message}<p class="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p>{/if}
  {#if loading}<div class="surface p-12 flex items-center justify-center gap-3" role="status"><Spinner size="sm" /><span class="text-sm text-zinc-500">Loading configuration…</span></div>
  {:else if project}
    {#if readOnly}<p class="surface p-4 text-sm text-zinc-600 dark:text-zinc-400">This project is archived. Its configuration and history are preserved. Restore it from Projects to edit or run tests.</p>{/if}
    <div class="grid gap-6 xl:grid-cols-2 items-start">
      <section class="surface p-5 space-y-5" aria-label="Environment configuration">
        <div><h2 class="section-heading">Application environments</h2><p class="text-sm text-zinc-500 mt-2">Set the address the runner will open for each environment.</p></div>
        <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Environment<select class={`${control} mt-2 w-full`} aria-label="Configuration environment" value={environment} disabled={saving} onchange={event => chooseEnvironment(event.currentTarget.value as EnvironmentName)}><option value="production">Production</option><option value="staging">Staging</option><option value="local">Local</option></select></label>
        <form class="space-y-4" onsubmit={event => { event.preventDefault(); saveEnvironment() }}>
          <Input label="Application URL" type="url" bind:value={url} placeholder="http://localhost:3000" required={!fallback} disabled={readOnly || saving || fallback} />
          {#if environment !== 'production'}<label class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><input type="checkbox" bind:checked={fallback} disabled={readOnly || saving} class="accent-amber-700" />Use the Production URL</label>{/if}
          <Button type="submit" variant="secondary" loading={saving} disabled={readOnly}>Save environment</Button>
        </form>
        <p class="text-xs text-zinc-500 break-all">{environmentReady ? `Saved address: ${effectiveUrl}` : 'Save an address before configuring accounts or running tests.'}</p>
      </section>
      <section class="surface p-5 space-y-4" aria-label="Login configuration">
        <div><h2 class="section-heading">Reusable login flow</h2><p class="text-sm text-zinc-500 mt-2">A saved account provides credentials. A login flow describes how to enter them and confirm a successful sign-in.</p></div>
        {#each loginFlows as file}<div class="flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3"><span class="text-sm text-zinc-700 dark:text-zinc-300 break-all">{file.path}</span>{#if !readOnly}<a class="text-sm font-medium text-amber-700 dark:text-amber-400" href={`/editor?project=${projectId}&file=${encodeURIComponent(file.path)}`}>Edit flow</a>{/if}</div>{:else}<p class="text-sm text-zinc-500">No login flow yet. If your application requires sign-in, create a reusable AUTH flow in the editor and reference it from your suites. Public tests can run without a test account.</p>{/each}
        {#if !readOnly}<a class="action-link" href={`/editor?project=${projectId}`}>Open editor</a>{/if}
      </section>
      <section class="surface p-5 space-y-5 xl:col-span-2" aria-label="Test account configuration">
        <div><h2 class="section-heading">Application test accounts</h2><p class="text-sm text-zinc-500 mt-2">These accounts sign in to your application. Your Axtest account is separate. Accounts are saved per environment and URL.</p><p class="text-xs text-zinc-500 mt-2">Passwords are encrypted and are never shown again. {$useMock ? 'Mock accounts last for this mock session only.' : ''}</p></div>
        {#each accounts.filter(item => item.environment === environment) as account}<div class="flex flex-wrap justify-between items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"><div><p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{account.name}</p><p class="text-xs text-zinc-500 mt-1">{account.targetUrl === normalizedUrl(effectiveUrl) ? 'Available for this address' : 'Saved for another address; create a new account for the current URL.'}</p></div><button class="text-xs text-red-600 dark:text-red-400" disabled={readOnly || saving} onclick={() => removeAccount(account)}>Delete {account.name}</button></div>{:else}<p class="text-sm text-zinc-500">No test accounts saved for this environment.</p>{/each}
        {#if !readOnly}
          <form class="space-y-4 max-w-xl" onsubmit={event => { event.preventDefault(); saveAccount() }}>
            <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Add a test account</h3>
            <Input label="Account name" bind:value={accountName} placeholder="QA test account" required disabled={saving || !environmentReady} />
            {#each accountFields as name}<Input label={name === 'AXTEST_USERNAME' ? 'Username' : name === 'AXTEST_PASSWORD' ? 'Password' : name.replace(/^AXTEST_/, '').replaceAll('_', ' ')} type={/PASSWORD|TOKEN|SECRET|KEY/.test(name) ? 'password' : 'text'} bind:value={() => accountValues[name] ?? '', value => { accountValues[name] = value }} autocomplete="off" disabled={saving || !environmentReady} />{/each}
            <Button type="submit" loading={saving} disabled={!environmentReady || !accountName.trim() || !Object.values(accountValues).some(value => value.length)}>Save test account</Button>
          </form>
        {/if}
      </section>
    </div>
  {:else}<a href="/projects" class="action-link">Open projects</a>{/if}
</div></div>
