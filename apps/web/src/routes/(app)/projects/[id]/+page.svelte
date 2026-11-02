<script lang="ts">
  import { untrack, onDestroy, onMount } from 'svelte'
  import { beforeNavigate } from '$app/navigation'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import type { Project, ProjectEnvironment, TestAccount, TestFile, EnvironmentName, ProjectSetup, AccessCheck } from '$lib/api/types'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { authStore } from '$lib/stores/auth'
  import { modeKey, useMock } from '$lib/stores/dev'
  import { pageTitle, pageSubtitle, pageAction } from '$lib/stores/ui'
  import { globalProjects } from '$lib/stores/search'
  import ProjectNavigation from '$lib/components/layout/ProjectNavigation.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import { normalizedUrl } from '$lib/suites'
  import { resolveEffectiveUrl } from '$lib/editor/resolve-env-url'

  const projectId = $derived(Number($page.params.id))
  const environmentNames: EnvironmentName[] = ['local', 'staging', 'production']
  let project = $state<Project | null>(null), environments = $state<ProjectEnvironment[]>([]), accounts = $state<TestAccount[]>([]), files = $state<TestFile[]>([])
  let setups = $state<Record<string, ProjectSetup>>({})
  let environment = $state<EnvironmentName>('production'), url = $state(''), fallback = $state(false)
  let loading = $state(true), saving = $state(false), checking = $state<'connection' | 'login' | null>(null), error = $state(''), message = $state('')
  let connection = $state<AccessCheck | null>(null), loginCheck = $state<AccessCheck | null>(null)
  let verificationAccountId = $state(''), loginCheckedAt = $state(''), loginCheckedName = $state(''), connectionCheckedAt = $state('')
  let accountOpen = $state(false), editingAccount = $state<TestAccount | null>(null), accountName = $state(''), username = $state(''), password = $state('')
  let extras = $state<{ name: string; value: string; locked?: boolean }[]>([]), extraOpen = $state(false)
  let builderOpen = $state(false), loginPath = $state('/login'), usernameLabel = $state('Username'), passwordLabel = $state('Password'), submitLabel = $state('Sign in'), successKind = $state('visible'), successValue = $state('')
  let version = 0
  const effectiveUrl = $derived(resolveEffectiveUrl(environment, project, environments))
  const storedEnvironment = $derived(environments.find(item => item.name === environment))
  const savedUrl = $derived(environment === 'production' ? project?.baseUrl ?? '' : storedEnvironment?.baseUrl ?? '')
  const environmentReady = $derived(!!effectiveUrl && (environment === 'production' || !!storedEnvironment?.configured))
  const setup = $derived(setups[environment] ?? { environment, loginRequired: null, loginFlowId: null, defaultAccountId: null })
  const loginFlows = $derived(files.filter(file => file.path.startsWith('auth/') && /^\s*AUTH\s+/m.test(file.content) && !/^\s*TEST\s+/m.test(file.content)))
  const availableAccounts = $derived(accounts.filter(item => item.environment === environment && item.targetUrl === normalizedUrl(effectiveUrl)))
  const defaultAccount = $derived(availableAccounts.find(item => item.id === setup.defaultAccountId))
  const verificationAccount = $derived(availableAccounts.find(item => item.id === verificationAccountId))
  const selectedFlow = $derived(loginFlows.find(item => item.id === setup.loginFlowId))
  const hasTests = $derived(files.some(file => /^\s*TEST\s+/m.test(file.content)))
  const readOnly = $derived(!!project?.archivedAt)
  const busy = $derived(saving || checking !== null)
  const environmentDirty = $derived(url.trim() !== savedUrl || fallback !== (storedEnvironment?.useProductionFallback ?? false))
  const accountDirty = $derived(accountOpen && (!!username || !!password || accountName !== (editingAccount?.name ?? '') || extras.some((item, index) => !!item.value || item.name !== (editingAccount?.variableNames.filter(name => !['AXTEST_USERNAME', 'AXTEST_PASSWORD'].includes(name))[index] ?? ''))))
  const builderDirty = $derived(builderOpen && (!!successValue || successKind !== 'visible' || loginPath !== '/login' || usernameLabel !== 'Username' || passwordLabel !== 'Password' || submitLabel !== 'Sign in'))
  const dirty = $derived(environmentDirty || accountDirty || builderDirty)
  const setupComplete = $derived(environmentReady && setup.loginRequired !== null && (setup.loginRequired === false || (!!defaultAccount && !!selectedFlow)))
  const verificationKey = $derived(JSON.stringify([environment, effectiveUrl, url, fallback, setup.loginRequired, selectedFlow?.id, selectedFlow?.updatedAt, verificationAccount?.id, verificationAccount?.updatedAt, accountDirty, builderDirty]))
  $effect(() => { verificationKey; untrack(() => { loginCheck = null; loginCheckedAt = ''; loginCheckedName = '' }) })
  $effect(() => { environment; effectiveUrl; url; fallback; untrack(() => { connection = null; connectionCheckedAt = '' }) })
  const generatedFlow = $derived(`AUTH login-${environment}\nSTEPS\n navigate to ${JSON.stringify(loginPath)}\n wait for ${JSON.stringify(usernameLabel)} to appear\n type "{{AXTEST_USERNAME}}" in ${JSON.stringify(usernameLabel)}\n type "{{AXTEST_PASSWORD}}" in ${JSON.stringify(passwordLabel)}\n click ${JSON.stringify(submitLabel)}\nASSERT\n ${successKind === 'url' ? `assert url contains ${JSON.stringify(successValue)}` : `assert ${JSON.stringify(successValue)} is_visible`}\n`)

  function key() { return modeKey(`suites:${$authStore.user?.id}:${$currentWorkspace?.id}:${projectId}`) }
  function preferences() { try { return JSON.parse(localStorage.getItem(key()) ?? '{}') } catch { return {} } }
  function remember(accountId?: string | null) {
    const previous = preferences()
    localStorage.setItem(key(), JSON.stringify({ ...previous, environment, ...(accountId !== undefined ? { accountId: accountId ?? '', accountChoices: { ...previous.accountChoices, [environment]: accountId ?? '' } } : {}) }))
  }
  function discardDrafts() { url = savedUrl; fallback = storedEnvironment?.useProductionFallback ?? false; accountOpen = false; username = ''; password = ''; accountName = ''; extras = []; builderOpen = false; successValue = '' }
  function canLeave() { if (!dirty) return true; if (!confirm('Discard your unsaved configuration changes?')) return false; discardDrafts(); return true }
  beforeNavigate(navigation => { if (navigation.from && !canLeave()) navigation.cancel() })
  onMount(() => {
    const guard = (event: Event) => { if (!canLeave()) event.preventDefault() }
    for (const name of ['axtest:before-workspace-switch', 'axtest:before-signout', 'axtest:before-mode-switch']) window.addEventListener(name, guard)
    return () => { for (const name of ['axtest:before-workspace-switch', 'axtest:before-signout', 'axtest:before-mode-switch']) window.removeEventListener(name, guard) }
  })
  onDestroy(() => { version++; password = ''; username = ''; extras = [] })
  $effect(() => { const ws = $currentWorkspace; const id = projectId; if (ws) untrack(() => void load(ws.id, id)) })
  $effect(() => { pageTitle.set(project?.name ?? 'Project'); pageSubtitle.set('Configuration'); pageAction.set(null); return () => { pageTitle.set(''); pageSubtitle.set(''); pageAction.set(null) } })
  async function load(workspaceId: number, id: number) {
    const current = ++version
    loading = true; error = ''; project = null; files = []; accounts = []; setups = {}; environments = []; connection = null; loginCheck = null
    try {
      const list = await api().getProjects(workspaceId)
      if (current !== version) return
      const selected = list.find(item => item.id === id)
      if (!selected) throw new Error('This project is not available in the current workspace.')
      project = selected; globalProjects.set(list.filter(item => !item.archivedAt))
      const [envs, saved, explorer, ...settings] = await Promise.all([api().getEnvironments(id), api().getTestAccounts(id), api().getExplorer(id), ...environmentNames.map(name => api().getProjectSetup(id, name))])
      if (current !== version) return
      environments = envs; accounts = saved; files = explorer.files; setups = Object.fromEntries(settings.map(item => [item.environment, item]))
      const preferred = preferences().environment
      setEnvironment(environmentNames.includes(preferred) ? preferred : selected.baseUrl ? 'production' : 'local')
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not load configuration. Try reopening the project.' }
    finally { if (current === version) loading = false }
  }
  function setEnvironment(value: EnvironmentName) {
    environment = value; url = value === 'production' ? project?.baseUrl ?? '' : environments.find(item => item.name === value)?.baseUrl ?? ''
    fallback = environments.find(item => item.name === value)?.useProductionFallback ?? false
    accountOpen = false; username = ''; password = ''; extras = []; accountName = ''; builderOpen = false; connection = null; loginCheck = null; verificationAccountId = setups[value]?.defaultAccountId ?? ''; error = ''; message = ''; remember()
  }
  function chooseEnvironment(value: string) { if (canLeave()) setEnvironment(value as EnvironmentName) }
  async function saveEnvironment() {
    if (!project || !$currentWorkspace || readOnly || busy) return
    const current = version; saving = true; error = ''; message = ''
    try {
      if (environment === 'production') {
        const updated = await api().updateProject($currentWorkspace.id, projectId, { name: project.name, baseUrl: url.trim(), description: project.description ?? undefined })
        if (current !== version) return
        project = updated
      } else await api().upsertEnvironment(projectId, environment, { baseUrl: url.trim(), useProductionFallback: fallback })
      const envs = await api().getEnvironments(projectId)
      if (current !== version) return
      environments = envs; url = savedUrl; connection = null; loginCheck = null; message = 'Address saved. Check the connection when your application is running.'; remember()
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not save this environment. Your changes are still here.' }
    finally { saving = false }
  }
  async function saveAccess(patch: Partial<ProjectSetup>) {
    if (!project || readOnly) return false
    const current = version; saving = true; error = ''; message = ''
    try {
      const saved = await api().saveProjectSetup(projectId, environment, { loginRequired: setup.loginRequired, loginFlowId: selectedFlow?.id ?? null, defaultAccountId: defaultAccount?.id ?? null, ...patch })
      if (current !== version) return false
      setups = { ...setups, [environment]: saved }; loginCheck = null; if (!verificationAccountId) verificationAccountId = saved.defaultAccountId ?? ''; remember(saved.defaultAccountId); message = 'Access settings saved.'; return true
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not save access settings.'; return false }
    finally { saving = false }
  }
  async function check(kind: 'connection' | 'login') {
    if (busy || readOnly || environmentDirty) return
    if (kind === 'login' && (!verificationAccount || !selectedFlow || dirty)) return
    const contextKey = verificationKey, checkedName = verificationAccount?.name ?? ''
    if (kind === 'login') { loginCheck = null; loginCheckedAt = '' } else { connection = null; connectionCheckedAt = '' }
    checking = kind; error = ''; message = ''; const current = version
    try {
      const result = kind === 'connection' ? await api().checkProjectConnection(projectId, environment) : await api().checkProjectLogin(projectId, environment, verificationAccountId)
      if (current !== version || contextKey !== verificationKey) return
      const checkedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      if (kind === 'connection') { connection = result; connectionCheckedAt = checkedAt } else { loginCheck = result; loginCheckedAt = checkedAt; loginCheckedName = checkedName }
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'The check could not complete. Try again.' }
    finally { checking = null }
  }
  function openAccount(account: TestAccount | null = null) {
    if (accountDirty && !confirm('Discard the account changes you have not saved?')) return
    editingAccount = account; accountName = account?.name ?? ''; username = ''; password = ''; accountOpen = true; error = ''
    extras = (account?.variableNames ?? []).filter(name => !['AXTEST_USERNAME', 'AXTEST_PASSWORD'].includes(name)).map(name => ({ name, value: '', locked: true })); extraOpen = extras.length > 0
  }
  function closeAccount() { if (busy) return; if (!accountDirty || confirm('Discard the account changes you have not saved?')) { accountOpen = false; username = ''; password = ''; extras = []; error = '' } }
  async function saveAccount() {
    if (!project || busy || readOnly) return
    const current = version; saving = true; error = ''; message = ''
    try {
      const variables: Record<string, string> = {}
      if (username) variables.AXTEST_USERNAME = username
      if (password) variables.AXTEST_PASSWORD = password
      for (const extra of extras) if (extra.name && extra.value) { if (extra.name in variables) throw new Error('Use a different name for each account input.'); variables[extra.name] = extra.value }
      const saved = editingAccount ? await api().updateTestAccount(projectId, editingAccount.id, { name: accountName.trim(), environment, variables }) : await api().saveTestAccount(projectId, { name: accountName.trim(), environment, variables })
      if (current !== version) return
      accounts = [...accounts.filter(item => item.id !== saved.id), saved]; if (!verificationAccountId) verificationAccountId = saved.id; accountOpen = false; username = ''; password = ''; extras = []; loginCheck = null
      if (!defaultAccount || defaultAccount.id === saved.id) {
        const selected = await saveAccess({ defaultAccountId: saved.id })
        message = selected ? 'Test account saved and selected as the default.' : 'Account saved. Choose it as the default to finish setup.'
      } else message = 'Test account saved.'
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not save the account. Your input is still here.' }
    finally { saving = false }
  }
  async function removeAccount(account: TestAccount) {
    if (busy || readOnly || !confirm(`Delete the saved test account ${account.name}?`)) return
    const current = version; saving = true; error = ''
    try {
      await api().deleteTestAccount(projectId, account.id)
      if (current !== version) return
      accounts = accounts.filter(item => item.id !== account.id); loginCheck = null; if (verificationAccountId === account.id) verificationAccountId = defaultAccount?.id ?? ''
      if (setup.defaultAccountId === account.id) { setups = { ...setups, [environment]: { ...setup, defaultAccountId: null } }; remember(null) }
      message = 'Account deleted.'
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not delete the account.' }
    finally { saving = false }
  }
  function openBuilder() { builderOpen = true; loginPath = '/login'; usernameLabel = 'Username'; passwordLabel = 'Password'; submitLabel = 'Sign in'; successKind = 'visible'; successValue = ''; error = '' }
  async function saveFlow() {
    if (busy || readOnly) return
    if (!loginPath.startsWith('/') || loginPath.startsWith('//')) { error = 'Use a login path within this application, such as /login.'; return }
    const flowPath = `auth/login-${environment}.axtest`
    const existing = files.find(file => file.path === flowPath)
    if (existing && !confirm(`Replace ${flowPath} with the login steps shown here?`)) return
    const current = version; saving = true; error = ''
    try {
      const file = existing ?? await api().createFile(projectId, { name: `login-${environment}`, folder: 'auth' })
      const saved = await api().saveFile(projectId, { ...file, content: generatedFlow })
      if (current !== version) return
      files = [...files.filter(item => item.id !== saved.id), saved]; builderOpen = false
      const linked = await saveAccess({ loginRequired: true, loginFlowId: saved.id }); message = linked ? 'Login flow saved. Select a test account, then check login.' : 'Login flow file saved. Select it from the login flow list to finish setup.'
    } catch (reason) { if (current === version) error = reason instanceof Error ? reason.message : 'Could not save the flow. Your steps are still here.' }
    finally { saving = false }
  }
</script>

<svelte:window onbeforeunload={event => { if (dirty) { event.preventDefault(); event.returnValue = '' } }} />
<div class="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950"><div class="page-shell space-y-6">
  <ProjectNavigation {projectId} name={project?.name} active="configuration" />
  <div class="flex flex-wrap items-start justify-between gap-4"><div><p class="eyebrow mb-2">Project setup</p><h1 class="page-heading">Configuration</h1><p class="page-description">Connect your application, set up access, and check that it works.</p></div>{#if !loading && project}<div class="space-y-1.5"><span class="block text-xs text-zinc-500">Configuring environment</span><DropdownMenu class="w-44" label="Configuration environment" value={environment} disabled={busy} options={environmentNames.map(name => ({ value: name, label: name[0].toUpperCase() + name.slice(1) }))} onchange={chooseEnvironment} /></div>{/if}</div>
  {#if $page.url.searchParams.get('needs')}<p class="surface p-4 text-sm text-zinc-600 dark:text-zinc-400" role="status">{$page.url.searchParams.get('needs') === 'environment' ? 'The selected tests need an application address. Save it below, then return to Test suites.' : `The selected tests need these inputs: ${$page.url.searchParams.get('inputs') ?? 'test account credentials'}. Choose or update the default account, then return to Test suites. Your test selection is preserved.`}</p>{/if}
  {#if error && !accountOpen}<p class="error-banner" role="alert">{error}</p>{/if}{#if message}<p class="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p>{/if}
  {#if loading}<div class="surface p-12 flex items-center justify-center gap-3" role="status"><Spinner size="sm" /><span class="text-sm text-zinc-500">Loading configuration…</span></div>
  {:else if project}
    {#if readOnly}<p class="surface p-4 text-sm text-zinc-600 dark:text-zinc-400">This project is archived. Restore it from Projects to change configuration or run tests.</p>{/if}
    <section class="surface p-5 space-y-5" aria-label="Environment configuration">
      <div><p class="eyebrow mb-2">Step 1</p><h2 class="section-heading">Where does your application run?</h2><p class="text-sm text-zinc-500 mt-2">Save the address for <span class="capitalize">{environment}</span>. Other environments keep their own settings.</p></div>
      <form class="space-y-4 max-w-2xl" onsubmit={event => { event.preventDefault(); saveEnvironment() }}>
        <Input label="Application URL" type="url" bind:value={url} placeholder="http://localhost:3000" required={!fallback} disabled={readOnly || busy || fallback} />
        {#if environment !== 'production'}<label class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><input type="checkbox" bind:checked={fallback} disabled={readOnly || busy} class="accent-amber-700" />Use the Production URL</label>{/if}
        <div class="flex flex-wrap items-center gap-3"><Button type="submit" variant="secondary" loading={saving} disabled={readOnly || !environmentDirty}>Save address</Button>{#if environmentDirty}<span class="text-xs text-amber-700 dark:text-amber-400">Unsaved address changes</span>{/if}</div>
      </form>
      <p class="text-xs text-zinc-500 break-all">{environmentReady ? `Saved address: ${effectiveUrl}` : 'Save an address to enable connection and account setup.'}</p>
    </section>
    <section class="surface p-5 space-y-5" aria-label="Login configuration">
      <div><p class="eyebrow mb-2">Step 2</p><h2 class="section-heading">Does this application require login?</h2><p class="text-sm text-zinc-500 mt-2">Application test accounts are separate from your Axtest account.</p></div>
      <DropdownMenu label="Application login" value={setup.loginRequired === null ? 'unset' : setup.loginRequired ? 'yes' : 'no'} disabled={readOnly || busy} options={[{ value: 'unset', label: 'Choose application access', disabled: true }, { value: 'no', label: 'No login required' }, { value: 'yes', label: 'Login required' }]} onchange={value => { if (!accountDirty && !builderDirty || canLeave()) void saveAccess({ loginRequired: value === 'yes' }) }} />
      {#if setup.loginRequired === false}<p class="text-sm text-zinc-500">No test account or login flow is needed for public journeys. Previously saved accounts and flows are kept. Existing suites retain their own authentication settings.</p>
      {:else if setup.loginRequired === true}
        <div class="grid gap-6 xl:grid-cols-2 items-start border-t border-zinc-100 dark:border-zinc-800 pt-5">
          <section class="space-y-4" aria-label="Test account configuration">
            <div class="flex items-center justify-between gap-3"><h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Test accounts <span class="capitalize text-zinc-500 font-normal">· {environment}</span></h3><Button size="sm" variant="secondary" disabled={readOnly || busy || !environmentReady || environmentDirty} onclick={() => openAccount()}>Add account</Button></div>
            {#if !environmentReady || environmentDirty}<p class="text-sm text-zinc-500">Save the application address before adding or selecting an account.</p>{/if}
            <DropdownMenu label="Default test account" value={defaultAccount?.id ?? ''} disabled={readOnly || busy || !environmentReady || environmentDirty} options={[{ value: '', label: 'Choose a default account', disabled: true }, ...availableAccounts.map(account => ({ value: account.id, label: account.name }))]} onchange={value => saveAccess({ defaultAccountId: value })} />
            <p class="text-xs text-zinc-500">The default is shared with this environment's test suites. Passwords are encrypted and never shown again.</p>
            {#each accounts.filter(item => item.environment === environment) as account}<div class="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2"><div class="flex items-center justify-between gap-3"><p class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200" title={account.name}>{account.name}{#if defaultAccount?.id === account.id}<span class="ml-2 text-xs font-normal text-zinc-500">Default</span>{/if}</p><div class="flex gap-3"><button aria-label={`Edit ${account.name}`} class="text-xs font-medium whitespace-nowrap text-zinc-600 dark:text-zinc-400" disabled={readOnly || busy || environmentDirty} onclick={() => openAccount(account)}>Edit</button><button aria-label={`Delete ${account.name}`} class="text-xs whitespace-nowrap text-red-600 dark:text-red-400" disabled={readOnly || busy} onclick={() => removeAccount(account)}>Delete</button></div></div>{#if account.targetUrl !== normalizedUrl(effectiveUrl)}<p class="text-xs text-amber-700 dark:text-amber-400">Saved for {account.targetUrl}. Edit and re-enter credentials to use the new address.</p>{/if}</div>{:else}<p class="text-sm text-zinc-500">No test accounts saved for this environment.</p>{/each}
          </section>
          <section class="space-y-4" aria-label="Login flow setup">
            <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">How should Axtest sign in?</h3><p class="text-sm text-zinc-500">Choose an existing login flow or describe the fields and successful-login check below.</p>
            <DropdownMenu label="Login flow" value={selectedFlow?.id ?? ''} disabled={readOnly || busy} options={[{ value: '', label: 'Choose a login flow', disabled: true }, ...loginFlows.map(flow => ({ value: flow.id, label: flow.path.replace(/^auth\//, '').replace(/\.axtest$/, '') }))]} onchange={value => saveAccess({ loginFlowId: value })} />
            {#if selectedFlow}<p class="text-xs text-zinc-500">Suites can reuse this flow through their authentication setting.</p>{/if}
            {#if !readOnly}<div class="flex flex-wrap gap-3"><Button size="sm" variant="secondary" disabled={busy || builderOpen} onclick={openBuilder}>Set up login steps</Button>{#if selectedFlow}<a class="text-xs font-medium text-amber-700 dark:text-amber-400 self-center" href={`/editor?project=${projectId}&file=${encodeURIComponent(selectedFlow.path)}`}>Edit in editor</a>{/if}</div>{/if}
            {#if builderOpen}
              <form class="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4" onsubmit={event => { event.preventDefault(); saveFlow() }}>
                <p class="text-xs text-zinc-500">For a standard username and password form. Use the editor for other sign-in journeys.</p>
                <Input label="Login page path" bind:value={loginPath} required disabled={busy} hint="A path within this application, such as /login." />
                <Input label="Username field label" bind:value={usernameLabel} required disabled={busy} /><Input label="Password field label" bind:value={passwordLabel} required disabled={busy} /><Input label="Sign-in button text" bind:value={submitLabel} required disabled={busy} />
                <DropdownMenu label="Login success check" value={successKind} disabled={busy} options={[{ value: 'visible', label: 'Text appears after login' }, { value: 'url', label: 'URL contains a path' }]} onchange={value => { successKind = value }} />
                <Input label={successKind === 'url' ? 'Expected URL path' : 'Text visible after login'} bind:value={successValue} required disabled={busy} placeholder={successKind === 'url' ? '/tasks' : 'Your tasks'} />
                <details><summary class="text-xs text-zinc-500 cursor-pointer">Preview reusable login flow</summary><pre class="text-xs whitespace-pre-wrap break-words text-zinc-500 mt-3">{generatedFlow}</pre></details>
                <div class="flex flex-wrap gap-2"><Button type="submit" loading={saving}>Save login flow</Button><Button variant="secondary" disabled={busy} onclick={() => { if (!builderDirty || confirm('Discard the login steps you have not saved?')) builderOpen = false }}>Cancel</Button></div>
              </form>
            {/if}
          </section>
        </div>
      {/if}
    </section>
    <section class="surface overflow-hidden" aria-label="Setup readiness">
      <div class="px-5 pt-5"><p class="eyebrow mb-2">Step 3</p><h2 class="section-heading">Verify access</h2><p class="text-sm text-zinc-500 mt-2">Review the saved setup and try the account you want to check.</p></div>
      <div class="grid gap-6 xl:grid-cols-2 p-5">
        <div class="space-y-4" aria-label="Saved setup summary">
          <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Saved setup</h3>
          <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-sm">
            <dt class="text-zinc-500">Environment</dt><dd class="capitalize text-zinc-800 dark:text-zinc-200">{environment}</dd>
            <dt class="text-zinc-500">Address</dt><dd class="break-all text-zinc-800 dark:text-zinc-200">{environmentReady ? effectiveUrl : 'Not configured'}{#if environmentDirty}<span class="block text-xs text-amber-700 dark:text-amber-400 mt-1">Address changes have not been saved</span>{/if}</dd>
            <dt class="text-zinc-500">Access</dt><dd class="text-zinc-800 dark:text-zinc-200">{setup.loginRequired === null ? 'Choose whether login is required' : setup.loginRequired ? 'Login required' : 'Public application'}</dd>
            {#if setup.loginRequired === true}<dt class="text-zinc-500">Login flow</dt><dd class="break-all text-zinc-800 dark:text-zinc-200">{selectedFlow?.path ?? 'Choose a login flow in Step 2'}</dd><dt class="text-zinc-500">Suite default</dt><dd class="break-words text-zinc-800 dark:text-zinc-200">{defaultAccount?.name ?? 'Choose a default account in Step 2'}</dd>{/if}
          </dl>
          <p class="text-xs text-zinc-500">{setupComplete ? 'Setup is saved. Verify access before a full test run.' : 'Complete the missing settings above before running tests.'}</p>
        </div>
        <div class="space-y-4 xl:border-l xl:border-zinc-100 xl:dark:border-zinc-800 xl:pl-6" aria-label="Access verification">
          {#if setup.loginRequired === true}
            <div><h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Try a test account</h3><p class="text-xs text-zinc-500 mt-2">Choosing an account here does not change the default used by suites.</p></div>
            <DropdownMenu class="w-full" label="Account to verify" value={verificationAccount?.id ?? ''} disabled={busy || readOnly} options={[{ value: '', label: 'Choose an account to verify', disabled: true }, ...availableAccounts.map(account => ({ value: account.id, label: account.name }))]} onchange={value => { verificationAccountId = value }} />
            <div class="flex flex-wrap gap-2"><Button onclick={() => check('login')} loading={checking === 'login'} disabled={!environmentReady || !verificationAccount || !selectedFlow || dirty || busy || readOnly || $useMock}>Check login</Button><Button variant="secondary" onclick={() => check('connection')} loading={checking === 'connection'} disabled={!environmentReady || environmentDirty || busy || readOnly || $useMock}>Check connection</Button></div>
            {#if accountDirty || builderDirty}<p class="text-xs text-zinc-500">Save your account and login changes before checking.</p>{/if}
            {#if loginCheck}<div class="rounded-lg border p-3 space-y-2 {loginCheck.ok ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200 dark:border-red-900'}" role="status"><p class="text-xs text-zinc-500">{loginCheckedName} · Checked at {loginCheckedAt}</p><p class="text-sm {loginCheck.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">{loginCheck.message}</p>{#if loginCheck.detail}<details class="text-xs text-zinc-500"><summary class="cursor-pointer font-medium">What failed?</summary><p class="mt-2 whitespace-pre-wrap break-words">{loginCheck.detail}</p></details>{/if}</div>{/if}
          {:else}
            <div><h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Try the connection</h3><p class="text-xs text-zinc-500 mt-2">Check that the saved application address responds.</p></div>
            <Button onclick={() => check('connection')} loading={checking === 'connection'} disabled={!environmentReady || environmentDirty || busy || readOnly || $useMock}>Check connection</Button>
          {/if}
          {#if connection}<div class="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2" role="status"><p class="text-xs text-zinc-500">Connection · Checked at {connectionCheckedAt}</p><p class="text-sm {connection.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">{connection.message}</p></div>{/if}
          <p class="text-xs text-zinc-500">Checks run from the API computer in a fresh background session. {$useMock ? 'Switch to API mode to verify the real application.' : 'Results apply to the current saved settings and account.'}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3 border-t border-zinc-100 dark:border-zinc-800 px-5 py-4">{#if !readOnly}<a class="action-link primary" href={hasTests ? `/projects/${projectId}/suites` : `/editor?project=${projectId}`}>{hasTests ? 'Open test suites' : 'Create your first test'}</a>{/if}<p class="text-xs text-zinc-500">{setupComplete ? 'Your test suites reuse this saved configuration.' : 'You can write tests now and finish setup before running them.'}</p></div>
    </section>
  {:else}<a class="action-link" href="/projects">Open projects</a>{/if}
</div></div>


<SlidePanel open={accountOpen} title={editingAccount ? 'Edit test account' : 'Add test account'} onclose={closeAccount} dismissible={!busy}>
              <form class="p-5 space-y-4" onsubmit={event => { event.preventDefault(); saveAccount() }}>
                <p class="text-xs text-zinc-500 break-all"><span class="capitalize">{environment}</span> · {effectiveUrl}</p>
                {#if error}<p class="error-banner" role="alert">{error}</p>{/if}
                {#if editingAccount}<p class="text-xs text-zinc-500">Leave credential fields blank to keep their saved values. For a changed address, re-enter every saved account input.</p>{/if}
                <Input label="Account name" bind:value={accountName} required disabled={busy} />
                <Input label="Username" bind:value={username} required={!editingAccount || editingAccount.targetUrl !== normalizedUrl(effectiveUrl)} disabled={busy} autocomplete="off" />
                <Input label="Password" type="password" bind:value={password} required={!editingAccount || editingAccount.targetUrl !== normalizedUrl(effectiveUrl)} disabled={busy} autocomplete="off" />
                <details bind:open={extraOpen}><summary class="text-xs font-medium text-zinc-500 cursor-pointer">Additional account inputs</summary><p class="text-xs text-zinc-500 mt-2">Optional tokens or account-specific inputs. General test data does not belong in an account.</p>{#each extras as extra}<div class="grid gap-2 mt-3"><Input label="Input name" bind:value={extra.name} placeholder="AXTEST_TOKEN" disabled={busy || !!extra.locked} /><Input label="Input value" type="password" bind:value={extra.value} disabled={busy} autocomplete="off" /></div>{/each}<button type="button" class="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400" disabled={busy} onclick={() => { extras = [...extras, { name: '', value: '' }] }}>Add account input</button></details>
                <div class="flex gap-2"><Button type="submit" loading={saving}>Save test account</Button><Button variant="secondary" disabled={busy} onclick={closeAccount}>Cancel</Button></div>
              </form>
</SlidePanel>
