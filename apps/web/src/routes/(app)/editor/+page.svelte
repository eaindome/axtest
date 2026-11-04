<script lang="ts">
  import { onMount, onDestroy, untrack, tick } from 'svelte'
  import { beforeNavigate, goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import { toast } from '$lib/stores/toasts'
  import { authStore } from '$lib/stores/auth'
  import { suitePreferenceKey, readSuitePreferences, saveSuiteContext, savedEnvironment, reconcileSuiteSelection } from '$lib/suite-context'
  import { selectedExecution, selectedInputNames, canUseVisualEditor, normalizedUrl, suiteLabel } from '$lib/suites'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import { runPreferences } from '$lib/run-preferences'
  import { useMock } from '$lib/stores/dev'
  import type { TestAccount } from '$lib/api/types'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { parseAxtest, serializeAxtest } from '$lib/editor/parse-axtest'
  import { validateAxtest } from '$lib/editor/validate-axtest'
  import { countDiagnostics } from '$lib/editor/axtest-lint'
  import type { Diagnostic } from '@codemirror/lint'
  import { loadPanelSizes, savePanelSizes, clamp, type FileStatusInfo, type FileRunStatus } from '$lib/editor/editor-panels'
  import { parentFolderPath } from '$lib/editor/file-tree'
  import type { ParsedFile } from '$lib/editor/types'
  import type { Project, TestFile, RunDetail, ProjectEnvironment, EnvironmentName } from '$lib/api'
  import { matchesKindFilter, type TestKindFilter } from '$lib/editor/test-kind'
  import { resolveEffectiveUrl, needsEnvironmentSetup, isOverridableEnv } from '$lib/editor/resolve-env-url'

  import EditorToolbar from '$lib/components/editor/EditorToolbar.svelte'
  import RunSettings from '$lib/components/editor/RunSettings.svelte'
  import FileSetupPanel from '$lib/components/editor/FileSetupPanel.svelte'
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte'
  import RunInputsPanel from '$lib/components/editor/RunInputsPanel.svelte'
  import { runInputNames } from '$lib/editor/run-inputs'
  import EnvironmentSetupModal from '$lib/components/editor/EnvironmentSetupModal.svelte'
  import FileTree from '$lib/components/editor/FileTree.svelte'
  import CodeEditor from '$lib/components/editor/CodeEditor.svelte'
  import VisualBuilder from '$lib/components/editor/VisualBuilder.svelte'
  import EditorOutline from '$lib/components/editor/EditorOutline.svelte'
  import LessonCoach from '$lib/components/editor/LessonCoach.svelte'
  import ResultsPanel from '$lib/components/editor/ResultsPanel.svelte'
  import ResizeHandle from '$lib/components/editor/ResizeHandle.svelte'
  import { isTutorialLessonId, getLessonFilePath } from '$lib/docs/tutorial-lessons'
  import { ensureTutorialSandbox, applyLessonStarter, beginLessonPractice } from '$lib/docs/tutorial-practice'
  import { setTutorialActiveLesson } from '$lib/stores/tutorial'

  const savedPanels = loadPanelSizes()

  let runController: AbortController | undefined
  let inputNames = $state<string[]>([])
  let runSetupOpen = $state(false), runSetupExpanded = $state(false), suiteSettingsOpen = $state(false)
  type RunSetup = { variables: Record<string, string>; headed: boolean; slowMoMs: number }
  let resolveInputs: ((values: RunSetup | null) => void) | null = null
  function finishInputs(values: Record<string, string> | null) {
    runSetupOpen = false; inputNames = []; resolveInputs?.(values === null ? null : { variables: values, headed: !$useMock && runSettings.headed, slowMoMs: runSettings.slowMoMs }); resolveInputs = null
  }
  function requestInputs(): Promise<RunSetup | null> {
    const names = runInputNames(editorContent, files)
    inputNames = names
    runSetupOpen = true
    return new Promise(resolve => { resolveInputs = resolve })
  }
  onDestroy(() => finishInputs(null))
  onDestroy(() => runController?.abort())
  let updatingRoute = false
  beforeNavigate(({ cancel, willUnload }) => { if (!updatingRoute && !willUnload && dirty && !window.confirm("Leave this page and discard unsaved changes?")) cancel() })

  let projects       = $state<Project[]>([])
  let activeProject  = $state<Project | null>(null)
  let files          = $state<TestFile[]>([])
  let explorerFolders = $state<string[]>([])
  let activeFile     = $state<TestFile | null>(null)
  let editorContent  = $state('')
  const parsedContent = $derived(parseAxtest(editorContent))
  let dirty          = $state(false)
  let dirtyFileIds   = $state<Set<string>>(new Set())
  let fileRunStatus  = $state<Record<string, FileRunStatus>>({})
  function notifyError(error: unknown) { toast(error instanceof Error ? error.message : String(error), 'error') }
  let draftSuite = $state(false), draftName = $state(''), draftError = $state('')
  let accounts = $state<TestAccount[]>([]), accountId = $state(''), accountChoices = $state<Record<string, string>>({})
  let runSettings = $state(runPreferences(undefined))
  let defaultAccounts = $state<Record<string, string | null>>({})
  let runReadiness = $state<string[]>([])
  let lastEditorRoute = ''
  function contextKey(id = activeProject?.id) { return suitePreferenceKey($authStore.user?.id, $currentWorkspace?.id, id) }
  function persistContext() { if (activeProject) saveSuiteContext(contextKey(), { runSettings, environment, accountId, accountChoices: { ...accountChoices, [environment]: accountId } }) }
  const availableAccounts = $derived(accounts.filter(account => account.environment === environment && account.targetUrl === normalizedUrl(effectiveUrl)))
  const account = $derived(availableAccounts.find(account => account.id === accountId))
  const visualSafe = $derived(!activeFile || canUseVisualEditor({ ...activeFile, content: editorContent }))
  let saving         = $state(false)
  let running        = $state(false)
  let loadingFiles   = $state(true)
  let runResult      = $state<RunDetail | null>(null)
  let resultsOpen    = $state(false)
  let resultsHeight  = $state(savedPanels.results)
  let explorerWidth  = $state(savedPanels.explorer)
  let outlineWidth   = $state(savedPanels.outline)
  let explorerOpen = $state(savedPanels.explorerOpen), outlineOpen = $state(savedPanels.outlineOpen)
  let mode           = $state<'code' | 'visual'>('code')
  let environment    = $state<EnvironmentName>('production')
  let projectEnvironments = $state<ProjectEnvironment[]>([])
  let envModalOpen = $state(false)
  let envModalMode = $state<'setup' | 'edit'>('setup')
  let envModalEnvironment = $state<EnvironmentName>('staging')
  let pendingRunAfterEnv = $state<(() => Promise<void>) | null>(null)
  let visualParsed   = $state<ParsedFile | null>(null)
  let selectedTestId = $state<string | null>(null)
  let collapsedTests = $state<Set<string>>(new Set())
  let runningTestId  = $state<string | null>(null)
  let generatingTestId = $state<string | null>(null)
  let testKindFilter = $state<TestKindFilter>('all')
  let lessonId         = $state<string | null>(null)
  let sandboxProjectId = $state<number | null>(null)
  let lessonBooting    = $state(false)
  let lessonResetting  = $state(false)
  let lessonReady      = $state(false)

  let resizeExplorerStart = 0
  let resizeOutlineStart = 0
  let resizeResultsStart = 0

  const paramProjectId = $derived(() => {
    const v = $page.url.searchParams.get('project')
    return v ? Number(v) : null
  })
  const paramFilePath = $derived(() => $page.url.searchParams.get('file'))
  const paramLessonId = $derived(() => $page.url.searchParams.get('lesson'))
  const paramMode = $derived(() => ($page.url.searchParams.get('view') ?? $page.url.searchParams.get('mode')) as 'code' | 'visual' | null)
  function editorRoute() { return `${$currentWorkspace?.id}:${$page.url.search}` }
  async function updateEditorUrl() {
    if (!activeProject || !activeFile) return
    const params = new URLSearchParams({ project: String(activeProject.id), file: activeFile.path })
    lastEditorRoute = `${$currentWorkspace?.id}:?${params}`
    updatingRoute = true
    try { await goto(`/editor?${params}`, { replaceState: true, noScroll: true, keepFocus: true }) }
    finally { updatingRoute = false }
  }
  const inLessonMode = $derived(!!lessonId && isTutorialLessonId(lessonId))

  const validation = $derived(countDiagnostics(validateAxtest(editorContent)))
  const editorDiagnostics = $derived(validateAxtest(editorContent))

  let codeEditor = $state<{ focusTest: (name: string) => void; focusDiagnostic: (d: Diagnostic[], i: number, s?: 'error' | 'warning') => number } | undefined>()
  let diagnosticJumpIndex = $state(0)

  const testStatuses = $derived.by(() => {
    if (!runResult) return {} as Record<string, 'passed' | 'failed'>
    const parsed = (mode === 'visual' ? visualParsed : null) ?? parsedContent
    const map: Record<string, 'passed' | 'failed'> = {}
    for (const test of parsed.tests) {
      const r = runResult.results.find(res => res.testName === test.name)
      if (r && r.status !== 'skipped') map[test.id] = r.status
    }
    return map
  })

  const effectiveUrl = $derived.by(() => {
    if (!activeProject) return ''
    return resolveEffectiveUrl(environment, activeProject, projectEnvironments)
  })

  const envModalConfig = $derived(
    projectEnvironments.find(e => e.name === envModalEnvironment)
  )

  const environmentNeedsSetup = $derived(
    isOverridableEnv(environment) && needsEnvironmentSetup(environment, projectEnvironments)
  )

  const fileStatuses = $derived.by(() => {
    const map: Record<string, FileStatusInfo> = {}
    for (const f of files) {
      map[f.id] = {
        dirty: dirtyFileIds.has(f.id),
        runStatus: fileRunStatus[f.id],
      }
    }
    return map
  })

  $effect(() => {
    savePanelSizes({ explorer: explorerWidth, outline: outlineWidth, results: resultsHeight, explorerOpen, outlineOpen })
  })

  $effect(() => {
    const ws = $currentWorkspace, route = editorRoute()
    if (!ws || route === lastEditorRoute) return
    lastEditorRoute = route
    untrack(() => {
      const lessonParam = paramLessonId()
      if (lessonParam && isTutorialLessonId(lessonParam)) { void bootLessonPractice(lessonParam); return }
      lessonId = null; lessonReady = false; sandboxProjectId = null
      void loadProjects(ws.id)
    })
  })
  $effect(() => {
    const editor = codeEditor, selected = selectedTestId
    if (editor && mode === 'code') untrack(() => {
      const target = visualParsed?.tests.find(test => test.id === selected)?.name ?? parsedContent.tests.find(test => test.id === selected)?.name ?? $page.url.searchParams.get('test')
      if (target) void tick().then(() => editor.focusTest(target))
    })
  })

  function jumpToValidationIssue(severity: 'error' | 'warning') {
    if (!codeEditor) return
    diagnosticJumpIndex = codeEditor.focusDiagnostic(editorDiagnostics, diagnosticJumpIndex, severity)
    diagnosticJumpIndex++
  }

  async function loadEnvironments(projectId: number) {
    try {
      projectEnvironments = await api().getEnvironments(projectId)
    } catch {
      projectEnvironments = []
    }
  }

  function openEnvModal(mode: 'setup' | 'edit', env: EnvironmentName) {
    envModalEnvironment = env
    envModalMode = mode
    envModalOpen = true
  }

  function closeEnvModal() {
    envModalOpen = false
    pendingRunAfterEnv = null
  }

  async function finishEnvModal(action: () => Promise<void>) {
    await action()
    envModalOpen = false
    const run = pendingRunAfterEnv
    pendingRunAfterEnv = null
    if (run) await run()
  }

  async function withEnvironmentReady(run: () => Promise<void>) {
    if (isOverridableEnv(environment) && needsEnvironmentSetup(environment, projectEnvironments)) {
      openEnvModal('setup', environment)
      pendingRunAfterEnv = run
      return
    }
    await run()
  }

  function handleEnvironmentChange(env: string) {
    accountChoices = { ...accountChoices, [environment]: accountId }
    environment = env as EnvironmentName
    accountId = accountChoices[environment] ?? defaultAccounts[environment] ?? ''
    if (!availableAccounts.some(account => account.id === accountId)) accountId = ''
    runReadiness = []; persistContext()
    if (inLessonMode && isOverridableEnv(env) && needsEnvironmentSetup(env, projectEnvironments)) {
      openEnvModal('setup', env)
    }
  }

  function openEditEnvironmentModal() {
    if (!inLessonMode && activeProject) { persistContext(); void goto(`/projects/${activeProject.id}`); return }
    openEnvModal(environmentNeedsSetup ? 'setup' : 'edit', environment)
  }

  async function saveEnvironmentUrl(url: string) {
    if (!activeProject) return
    await finishEnvModal(async () => {
      if (envModalEnvironment === 'production') {
        const project = activeProject!
        const updated = await api().updateProject($currentWorkspace!.id, project.id, { name: project.name, baseUrl: url, description: project.description ?? undefined })
        activeProject = updated
        projects = projects.map(project => project.id === updated.id ? updated : project)
      } else projectEnvironments = await api().upsertEnvironment(activeProject!.id, envModalEnvironment, {
        baseUrl: url,
        useProductionFallback: false,
      })
    })
  }

  async function useProductionForEnvironment() {
    if (!activeProject) return
    const selectedEnvironment = envModalEnvironment
    if (selectedEnvironment === 'production') return
    await finishEnvModal(async () => {
      projectEnvironments = await api().upsertEnvironment(activeProject!.id, selectedEnvironment, {
        useProductionFallback: true,
      })
    })
  }

  async function deleteEnvironmentOverride() {
    if (!activeProject) return
    const selectedEnvironment = envModalEnvironment
    if (selectedEnvironment === 'production') return
    await finishEnvModal(async () => {
      projectEnvironments = await api().deleteEnvironment(activeProject!.id, selectedEnvironment)
    })
  }

  let projectLoadVersion = 0
  async function loadProjects(workspaceId: number) {
    const version = ++projectLoadVersion
    loadingFiles = true
    try {
      const projs = await api().getProjects(workspaceId)
      if (version !== projectLoadVersion) return
      projects = projs
      const pid = paramProjectId()
      const target = pid ? projs.find(p => p.id === pid) : projs[0]
      if (target) await selectProject(target)
      else { activeProject = null; activeFile = null; files = []; explorerFolders = []; editorContent = ''; dirty = false }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
    finally { if (version === projectLoadVersion) loadingFiles = false }
  }

  async function bootLessonPractice(id: string) {
    lessonBooting = true
    lessonReady = false
    try {
      beginLessonPractice(id)
      setTutorialActiveLesson(id)
      const sandboxId = await ensureTutorialSandbox()
      sandboxProjectId = sandboxId
      await applyLessonStarter(sandboxId, id)

      const projs = await api().getProjects($currentWorkspace!.id)
      projects = projs
      const sandbox = projs.find(p => p.id === sandboxId)
      if (!sandbox) return

      const filePath = paramFilePath() ?? getLessonFilePath(id)
      const lessonMode = paramMode()
      if (lessonMode === 'code' || lessonMode === 'visual') mode = lessonMode

      await selectProject(sandbox, filePath)
      lessonId = id
      lessonReady = true
    } catch {
      lessonId = null
    } finally {
      lessonBooting = false
    }
  }

  async function resetLessonFile() {
    if (!lessonId || !sandboxProjectId) return
    lessonResetting = true
    try {
      const updated = await api().resetLessonFile(sandboxProjectId, { lessonId })
      files = files.map(f => f.id === updated.id ? updated : f)
      if (activeFile?.id === updated.id) {
        editorContent = updated.content
        dirty = false
        visualParsed = mode === 'visual' ? parseAxtest(updated.content) : visualParsed
      }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
    lessonResetting = false
  }

  async function selectProject(project: Project, preferredFilePath?: string | null) {
    if (running || saving) return
    if (dirty && !(await saveFile())) return
    activeProject = project
    draftSuite = false; draftError = ''; runReadiness = []
    loadingFiles = true
    activeFile = null
    editorContent = ''
    dirty = false
    dirtyFileIds = new Set()
    runResult = null
    resultsOpen = false
    visualParsed = null
    selectedTestId = null
    testKindFilter = 'all'
    projectEnvironments = []
    closeEnvModal()
    try {
      const explorer = await api().getExplorer(project.id)
      files = explorer.files
      explorerFolders = explorer.folders
      await loadEnvironments(project.id)
      accounts = await api().getTestAccounts(project.id)
      const preferences = readSuitePreferences(contextKey(project.id))
      runSettings = runPreferences(preferences.runSettings)
      environment = savedEnvironment(preferences.environment)
      accountChoices = preferences.accountChoices ?? {}
      const settings = await Promise.all((['production', 'staging', 'local'] as EnvironmentName[]).map(name => api().getProjectSetup(project.id, name)))
      defaultAccounts = Object.fromEntries(settings.map(setup => [setup.environment, setup.defaultAccountId]))
      const setup = settings.find(setup => setup.environment === environment)!
      accountId = typeof preferences.accountId === 'string' ? preferences.accountId : setup.defaultAccountId ?? ''
      if (!availableAccounts.some(account => account.id === accountId)) accountId = ''
      mode = paramMode() === 'code' ? 'code' : 'visual'
      if ($page.url.searchParams.has('newSuite')) {
        const flow = files.find(file => file.id === setup.loginFlowId && setup.loginRequired)
        draftSuite = true; draftName = ''
        activeFile = { id: crypto.randomUUID(), name: 'Untitled suite', path: 'modules/untitled.axtest', content: '', updatedAt: '' }
        editorContent = `---\ntitle: Untitled suite\n---\n# axtest:suite\n${flow ? `AUTH ${flow.path.slice(5).replace(/\.axtest$/, '')}\n` : ''}`
        appendDraftTest(); loadingFiles = false; return
      }
      if (files.length > 0) {
        const targetPath = preferredFilePath ?? paramFilePath()
        const fromQuery = targetPath
          ? files.find(f => f.path === targetPath || f.name === targetPath)
          : null
        await selectFile(fromQuery ?? files[0])
        if ($page.url.searchParams.has('addTest')) appendDraftTest()
      }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
    loadingFiles = false
  }

  async function selectFile(file: TestFile) {
    if (running || saving) return
    if (dirty && activeFile && !(await saveFile())) return
    draftSuite = false
    activeFile = file
    editorContent = file.content
    dirty = false
    runResult = null
    resultsOpen = false
    selectedTestId = null
    testKindFilter = 'all'
    const parsed = parseAxtest(file.content)
    if (!canUseVisualEditor(file)) mode = 'code'
    if (mode === 'visual') visualParsed = parsed
    const target = parsed.tests.find(test => test.name === $page.url.searchParams.get('test'))
    if (target) { selectedTestId = target.id; await tick(); selectTest(target.id) }
  }

  function appendDraftTest() {
    const id = crypto.randomUUID(), name = `New behaviour${parsedContent.tests.length ? ' ' + (parsedContent.tests.length + 1) : ''}`
    editorContent = editorContent.trimEnd() + `\n\nTEST "${name}"\n  ID ${id}\nSTEPS\n  navigate to "/"\nASSERT\n  assert "" is_visible\n`
    markDirty()
    if (mode === 'visual') visualParsed = parseAxtest(editorContent)
    selectedTestId = id
    void tick().then(() => { selectTest(id); codeEditor?.focusTest(name) })
  }

  function markDirty() {
    dirty = true
    if (activeFile) {
      dirtyFileIds = new Set([...dirtyFileIds, activeFile.id])
    }
  }

  function onEdit(content: string) {
    runReadiness = []
    editorContent = content
    markDirty()
    if (mode === 'visual') visualParsed = parseAxtest(content)
  }

  async function saveFile() {
    if (!activeProject || !activeFile || !dirty) return true
    if (saving) return false
    if (!parsedContent.flow && !parsedContent.tests.length && (draftSuite || /^[ \t]*TEST\s+/m.test(activeFile.content)) && !editorContent.includes('# axtest:suite')) editorContent += '\n# axtest:suite\n'
    const fileId = activeFile.id
    const previousFile = activeFile
    const content = editorContent

    saving = true
    try {
      let updated: TestFile
      if (draftSuite) {
        const title = draftName.trim()
        if (!title || title.length > 80 || /[\r\n]/.test(title)) { draftError = 'Name this suite using up to 80 characters before saving.'; return false }
        if (files.some(file => suiteLabel(file).toLowerCase() === title.toLowerCase())) { draftError = 'A suite with this name already exists.'; return false }
        let slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'suite'
        if (files.some(file => file.path === `modules/${slug}.axtest`)) slug += '-' + crypto.randomUUID().slice(0, 6)
        const source = editorContent.replace(/^title:.*$/m, `title: ${title}`)
        updated = await api().createFile(activeProject.id, { name: slug, folder: 'modules', content: source })
        files = [...files, updated]; draftSuite = false
        if (editorContent === content) editorContent = source
      } else updated = await api().saveFile(activeProject.id, { ...activeFile, content: editorContent }, activeFile.updatedAt)
      files = files.map(f => f.id === updated.id ? updated : f)
      reconcileSuiteSelection(contextKey(), previousFile, updated)
      if (activeFile?.id === fileId) {
        activeFile = updated
        dirty = editorContent !== content && editorContent !== updated.content
      }
      const next = new Set(dirtyFileIds)
      if (!dirty) { next.delete(updated.id); next.delete(fileId) }
      dirtyFileIds = next
      if (mode === 'visual') visualParsed = parseAxtest(editorContent)
      await updateEditorUrl()
      toast('Suite saved.')
      return !dirty
    } catch (error) {
      notifyError(error instanceof Error ? error : 'We couldn’t save this file. Your changes are still in the editor.')
      return false
    } finally { saving = false }
  }

  async function runTests() { await runEditor() }
  async function runEditor(testId?: string) {
    if (!activeProject || !activeFile || running || saving) return
    const parsed = (mode === 'visual' ? visualParsed : null) ?? parsedContent
    const test = testId ? parsed.tests.find(test => test.id === testId) : undefined
    if (testId && !test) return
    runReadiness = []
    if (validation.errors) { runReadiness = ['Resolve the editor errors before running.']; return }
    if (!effectiveUrl || environmentNeedsSetup) { runReadiness = ['Save an address for this environment in Configuration.']; return }
    const source = { ...activeFile, content: editorContent }
    const selection = { [source.id]: test ? [test.name] : parsed.tests.map(test => test.name) }
    const allFiles = [...files.filter(file => file.id !== source.id), source]
    const required = parsed.flow ? runInputNames(editorContent, files).filter(name => name !== 'AXTEST_CASE') : selectedInputNames(allFiles, selection)
    const plan = parsed.flow ? { errors: [] } : selectedExecution(allFiles, selection)
    const credentials = required.filter(name => !inLessonMode && /USERNAME|PASSWORD|TOKEN|SECRET|KEY/.test(name) && !account?.variableNames.includes(name))
    runReadiness = [...plan.errors, ...(credentials.length ? [`Choose a saved account providing: ${credentials.join(', ')}.`] : [])]
    if (runReadiness.length) return
    if (dirty && !(await saveFile())) return
    const extra = required.filter(name => !account?.variableNames.includes(name))
    let setup: RunSetup = { variables: {}, headed: !$useMock && runSettings.headed, slowMoMs: runSettings.slowMoMs }
    if (extra.length) {
      inputNames = extra; runSetupOpen = true
      const values = await new Promise<RunSetup | null>(resolve => { resolveInputs = resolve })
      if (!values) return
      setup = values
    }
    persistContext(); runController = new AbortController(); running = true; runningTestId = testId ?? null; resultsOpen = true; runResult = null
    const projectId = activeProject.id, file = activeFile
    try {
      if (parsed.flow) {
        runResult = await api().runFile(projectId, { fileId: file.id, fileName: file.name, content: editorContent, environment, accountId: account?.id, ...setup }, { signal: runController.signal, onProgress: result => { runResult = result } })
      } else {
        const queued = await api().runSuites(projectId, { environment, accountId: account?.id, files: [{ fileId: file.id, ...(test ? { testNames: [test.name] } : {}) }], ...setup })
        while (!runController.signal.aborted) {
          runResult = await api().getRun(projectId, queued[0].id)
          if (runResult.status === 'passed' || runResult.status === 'failed') break
          await new Promise(resolve => setTimeout(resolve, 700))
        }
      }
      if (runResult) fileRunStatus = { ...fileRunStatus, [file.id]: runResult.status === 'passed' ? 'passed' : runResult.passedTests === 0 ? 'failed' : 'partial' }
    } catch (error) { notifyError(error) }
    finally { running = false; runningTestId = null }
  }

  function switchToVisual() {
    if (!visualSafe) { notifyError('This suite uses advanced syntax. Keep editing in Code to preserve its grouped flow.'); return }
    const selectedName = visualParsed?.tests.find(test => test.id === selectedTestId)?.name ?? parsedContent.tests.find(test => test.id === selectedTestId)?.name
    visualParsed = parseAxtest(editorContent)
    selectedTestId = visualParsed.tests.find(test => test.name === selectedName)?.id ?? visualParsed.tests[0]?.id ?? null
    mode = 'visual'
  }

  function switchToCode() {
    mode = 'code'
  }

  function onVisualChange(content: string, parsed?: ParsedFile) {
    runReadiness = []
    editorContent = content
    markDirty()
    if (parsed) visualParsed = parsed
  }

  function updateSuiteSettings(patch: Partial<ParsedFile>) {
    if (!visualSafe || !activeFile) return
    const parsed = mode === 'visual' ? visualParsed ?? parsedContent : parsedContent
    const next = { ...parsed, ...patch }
    if (parsed.flow && (patch.auth !== undefined || patch.module !== undefined)) {
      next.tests = next.tests.map(test => ({ ...test, name: (parsed.flow === 'auth' ? next.auth : next.module) ?? test.name }))
    }
    onVisualChange(serializeAxtest(next), next)
  }

  function selectTest(testId: string) {
    selectedTestId = testId
    const parsed = mode === 'visual' ? visualParsed : parsedContent
    const test = parsed?.tests.find(test => test.id === testId)
    if (test && !matchesKindFilter(test.kind, testKindFilter)) testKindFilter = 'all'
    if (mode === 'visual') {
      void tick().then(() => document.getElementById(`test-${testId}`)?.scrollIntoView({ block: 'nearest' }))
    } else if (test) codeEditor?.focusTest(test.name)
  }

  function toggleCollapse(testId: string) {
    const next = new Set(collapsedTests)
    if (next.has(testId)) next.delete(testId)
    else next.add(testId)
    collapsedTests = next
  }

  async function runSingleTest(testId: string) { await runEditor(testId) }

  async function handleGenerateTests(testId: string) {
    if (!activeProject || !activeFile) return
    generatingTestId = testId
    try {
      const draft = (mode === 'visual' ? visualParsed : null) ?? parsedContent
      if (!draft.tests.some(t => t.id === testId)) throw new Error('Select the test again before generating.')
      editorContent = serializeAxtest(draft)
      visualParsed = draft
      markDirty()
      if (dirty && !(await saveFile())) return
      const res = await api().generateTests(activeProject.id, {
        fileId: activeFile.id,
        content: editorContent,
        seedTestId: testId,
      })
      if (res.generatedCount === 0) return
      editorContent = res.content
      visualParsed = parseAxtest(res.content)
      markDirty()
      const parsed = visualParsed
      if (parsed) {
        const seedIdx = parsed.tests.findIndex(t => t.id === testId)
        const firstGenerated = seedIdx >= 0 ? parsed.tests[seedIdx + 1] : null
        if (firstGenerated) selectTest(firstGenerated.id)
      }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
    finally { generatingTestId = null }
  }

  async function handleCreateFile(name: string, folder: string | null) {
    if (!activeProject) return
    try {
      const file = await api().createFile(activeProject.id, { name, folder })
      const explorer = await api().getExplorer(activeProject.id)
      files = explorer.files
      explorerFolders = explorer.folders
      selectFile(file)
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function handleCreateFolder(path: string) {
    if (!activeProject) return
    try {
      const explorer = await api().createFolder(activeProject.id, path)
      files = explorer.files
      explorerFolders = explorer.folders
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function applyExplorer(explorer: { files: TestFile[]; folders: string[] }) {
    files = explorer.files
    explorerFolders = explorer.folders
  }

  async function handleDeleteFile(fileId: string) {
    if (!activeProject) return
    try {
      const explorer = await api().deleteFile(activeProject.id, fileId)
      await applyExplorer(explorer)
      if (activeFile?.id === fileId) {
        activeFile = files[0] ?? null
        editorContent = activeFile?.content ?? ''
        dirty = false
        visualParsed = activeFile ? parseAxtest(activeFile.content) : null
      }
      const nextDirty = new Set(dirtyFileIds)
      nextDirty.delete(fileId)
      dirtyFileIds = nextDirty
      const { [fileId]: _, ...rest } = fileRunStatus
      fileRunStatus = rest
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function handleRenameFile(fileId: string, name: string) {
    if (!activeProject) return
    try {
      const updated = await api().renameFile(activeProject.id, fileId, { name })
      files = files.map(f => f.id === updated.id ? updated : f)
      if (activeFile?.id === fileId) activeFile = updated
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function handleMoveFile(fileId: string, folder: string | null) {
    if (!activeProject) return
    try {
      await api().moveFile(activeProject.id, fileId, { folder })
      const explorer = await api().getExplorer(activeProject.id)
      await applyExplorer(explorer)
      if (activeFile?.id === fileId) {
        activeFile = files.find(f => f.id === fileId) ?? null
      }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function handleDeleteFolder(path: string) {
    if (!activeProject) return
    try {
      const deletedIds = files
        .filter(f => f.path.startsWith(`${path}/`) || parentFolderPath(f.path) === path || f.path === path)
        .map(f => f.id)
      const explorer = await api().deleteFolder(activeProject.id, path)
      await applyExplorer(explorer)
      if (activeFile && deletedIds.includes(activeFile.id)) {
        activeFile = files[0] ?? null
        editorContent = activeFile?.content ?? ''
        dirty = false
        visualParsed = activeFile ? parseAxtest(activeFile.content) : null
      }
      dirtyFileIds = new Set([...dirtyFileIds].filter(id => !deletedIds.includes(id)))
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function handleRenameFolder(path: string, name: string) {
    if (!activeProject) return
    try {
      const explorer = await api().renameFolder(activeProject.id, path, { name })
      await applyExplorer(explorer)
      if (activeFile) {
        const refreshed = files.find(f => f.id === activeFile!.id)
        if (refreshed) activeFile = refreshed
      }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  async function handleMoveFolder(path: string, targetFolder: string | null) {
    if (!activeProject) return
    try {
      const explorer = await api().moveFolder(activeProject.id, path, { targetFolder })
      await applyExplorer(explorer)
      if (activeFile) {
        const refreshed = files.find(f => f.id === activeFile!.id)
        if (refreshed) activeFile = refreshed
      }
    } catch (error) { notifyError(error instanceof Error ? error : 'Something went wrong. Please try again.') }
  }

  onMount(() => {
    function beforeModeSwitch(event: Event) {
      if (saving || running || runSetupOpen) { notifyError('Finish or cancel the current run before switching context.'); event.preventDefault(); return }
      if (dirty && !window.confirm('Switch context and discard unsaved changes?')) { event.preventDefault(); return }
      dirty = false
    }
    function beforeUnload(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('axtest:before-signout', beforeModeSwitch)
    window.addEventListener('axtest:before-mode-switch', beforeModeSwitch)
    window.addEventListener('axtest:before-workspace-switch', beforeModeSwitch)
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', handleKey); window.removeEventListener('axtest:before-signout', beforeModeSwitch); window.removeEventListener('axtest:before-mode-switch', beforeModeSwitch); window.removeEventListener('axtest:before-workspace-switch', beforeModeSwitch) }
  })
</script>

{#snippet editorPanelControls()}
        <nav aria-label="Editor panels" class="flex flex-wrap items-center gap-1">
          <button class="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 aria-pressed:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:aria-pressed:bg-zinc-800" aria-pressed={explorerOpen} aria-controls="editor-explorer" onclick={() => { explorerOpen = !explorerOpen }}>Explorer</button>
          {#if !inLessonMode}<button class="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 aria-pressed:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:aria-pressed:bg-zinc-800" aria-pressed={outlineOpen} aria-controls="editor-outline" onclick={() => { outlineOpen = !outlineOpen }}>Outline</button>{/if}
        </nav>
{/snippet}

<div class="flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
  {#if runSetupOpen}<RunInputsPanel names={inputNames} targetUrl={effectiveUrl} scope={`${$currentWorkspace?.id}:${activeProject?.id}:${environment}`} onSubmit={values => finishInputs(values)} onCancel={() => finishInputs(null)} />{/if}
  <div class="contents" inert={runSetupOpen}>

  {#if lessonBooting || loadingFiles}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-sm text-zinc-500" role="status">{lessonBooting ? 'Preparing your tutorial sandbox…' : 'Opening suite editor…'}</p>
    </div>
  {:else}

  <EditorToolbar
    {activeProject}
    {activeFile}
    {dirty}
    {saving}
    {running}
    {mode}
    validationErrors={validation.errors}
    validationWarnings={validation.warnings}
    onJumpToError={() => jumpToValidationIssue('error')}
    onJumpToWarning={() => jumpToValidationIssue('warning')}
    onSwitchCode={switchToCode}
    onSwitchVisual={switchToVisual}
    onSave={saveFile}
    onRun={runTests}
    setupOpen={runSetupExpanded}
    onSetup={() => { runSetupExpanded = true }}
    onSettings={() => { suiteSettingsOpen = true }}
    settingsDisabled={!visualSafe}
    suiteTitle={draftSuite ? draftName.trim() || 'New suite draft' : undefined}
  />

  {#if activeProject}
    <section class="shrink-0 bg-zinc-50 dark:bg-zinc-950 max-h-[40vh] overflow-y-auto" aria-label="Suite editor context">
      {#if draftSuite}<div class="max-w-lg space-y-1 px-5 pb-4"><label for="draft-suite-name" class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Suite name</label><input id="draft-suite-name" class="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm outline-none focus:ring-1 focus:ring-zinc-400/40" placeholder="Task management" bind:value={draftName} oninput={() => { markDirty(); draftError = '' }} />{#if draftError}<p role="alert" class="text-xs text-red-600">{draftError}</p>{/if}<p class="text-xs text-zinc-500">Name this suite and write its first behaviour below. It is created when you save.</p></div>{/if}
      {#if runReadiness.length}<div class="px-5 pb-3 text-sm text-amber-800 dark:text-amber-300" role="status">{#each runReadiness as reason}<p>{reason}</p>{/each}<a class="underline text-xs" href={`/projects/${activeProject.id}`}>Review configuration</a></div>{/if}
      {#if !visualSafe && activeFile}<p class="px-5 pb-3 text-xs text-zinc-500">This suite uses advanced syntax. Code preserves its grouped steps and assertions.</p>{/if}
    </section>
  {/if}

  <SlidePanel open={runSetupExpanded} title="Run setup" onclose={() => { runSetupExpanded = false }}>
    <div class="py-5 space-y-4"><p class="px-5 text-sm text-zinc-500">Choose the environment, test account and browser settings for this run.</p>
        <div class="flex flex-wrap items-center gap-3 px-5 pb-4" aria-label="Run context">
        <DropdownMenu label="Environment" value={environment} options={[{ value: 'local', label: 'Local' }, { value: 'staging', label: 'Staging' }, { value: 'production', label: 'Production' }]} disabled={running || saving} onchange={handleEnvironmentChange} />
        <DropdownMenu label="Test account" value={accountId} options={[{ value: '', label: 'No saved account' }, ...availableAccounts.map(account => ({ value: account.id, label: account.name }))]} disabled={running || saving} onchange={value => { accountId = value; runReadiness = []; persistContext() }} />
        <p class="min-w-0 basis-full xl:basis-0 xl:flex-1 text-xs text-zinc-500 break-all">{effectiveUrl || 'No address configured for this environment'}</p>
        <button type="button" disabled={running || saving} onclick={() => { runSetupExpanded = false; openEditEnvironmentModal() }} class="text-xs text-zinc-500">{environmentNeedsSetup ? 'Set URL' : 'Edit URL'}</button>
        {#if activeProject}<a class="text-xs text-zinc-500" href={`/projects/${activeProject.id}`}>Configuration</a>{/if}
        <RunSettings inline value={runSettings} disabled={running || saving} onchange={value => { runSettings = value; persistContext() }} />
        </div>
    </div>
  </SlidePanel>
  <SlidePanel open={suiteSettingsOpen} title="Suite settings" onclose={() => { suiteSettingsOpen = false }}>
    <div class="p-5">
      {#if activeFile && visualSafe}
        <FileSetupPanel draft={draftSuite} parsed={mode === 'visual' ? visualParsed ?? parsedContent : parsedContent} authOptions={[{ value: '', label: 'No login step' }, ...files.filter(file => file.path.startsWith('auth/') && !/^\s*TEST\s+/m.test(file.content)).map(file => ({ value: file.path.slice(5).replace(/\.axtest$/, ''), label: file.name.replace(/\.axtest$/, '') }))]} onMetaChange={(field, value) => updateSuiteSettings({ [field]: value })} onRulesChange={rules => updateSuiteSettings({ rules })} />
      {:else}<p class="text-sm text-zinc-500">Use Code to edit this suite's settings while preserving its advanced syntax.</p>{/if}
    </div>
  </SlidePanel>

  <EnvironmentSetupModal
    open={envModalOpen}
    environment={envModalEnvironment}
    project={activeProject}
    mode={envModalMode}
    currentUrl={envModalEnvironment === 'production' ? activeProject?.baseUrl : envModalConfig?.baseUrl}
    useProductionFallback={envModalConfig?.useProductionFallback ?? false}
    onSave={saveEnvironmentUrl}
    onUseProduction={useProductionForEnvironment}
    onDelete={envModalMode === 'edit' && envModalEnvironment !== 'production' ? deleteEnvironmentOverride : undefined}
    onCancel={closeEnvModal}
  />


  <div class="flex flex-1 overflow-hidden min-h-0">

    {#if explorerOpen}
    <div id="editor-explorer" class="flex shrink-0 min-h-0" role="region" aria-label="File explorer">
    <FileTree
      {files}
      folders={explorerFolders}
      activeFileId={activeFile?.id ?? null}
      loading={loadingFiles}
      width={explorerWidth}
      fileStatuses={fileStatuses}
      onSelect={selectFile}
      onCreateFile={handleCreateFile}
      onCreateFolder={handleCreateFolder}
      onDeleteFile={handleDeleteFile}
      onRenameFile={handleRenameFile}
      onMoveFile={handleMoveFile}
      onDeleteFolder={handleDeleteFolder}
      onRenameFolder={handleRenameFolder}
      onMoveFolder={handleMoveFolder}
    />

    <ResizeHandle
      direction="horizontal"
      side="left"
      onResizeStart={() => { resizeExplorerStart = explorerWidth }}
      onResize={(delta) => { explorerWidth = clamp(resizeExplorerStart + delta, 160, 400) }}
    />
    </div>
    {/if}

    <!-- Center: editor canvas + results -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden" role="region" aria-label="Test canvas">

      {#if !activeFile}
        <div class="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <div class="size-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <svg class="size-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-zinc-600 dark:text-zinc-400">{activeProject ? 'Select a spec file to edit' : 'Create a project to start testing'}</p>
            <p class="text-xs text-zinc-400 mt-1">{activeProject ? 'Choose from the explorer or create a new file' : 'Projects keep your application’s tests and environments together.'}</p>
            {#if !activeProject}<a href="/projects" class="action-link primary mt-5">Open projects</a>{/if}
          </div>
        </div>

      {:else if mode === 'code'}
        <div class="shrink-0 border-b border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2">
          <div class="flex flex-wrap items-center gap-2">{@render editorPanelControls()}</div>
        </div>
        <div class="flex-1 min-h-0 overflow-hidden">
          <CodeEditor bind:this={codeEditor} value={editorContent} onchange={onEdit} onsave={saveFile} />
        </div>

      {:else if visualParsed}
        <VisualBuilder
          controls={editorPanelControls}
          parsed={visualParsed}
          {selectedTestId}
          {collapsedTests}
          {runningTestId}
          {generatingTestId}
          testStatuses={testStatuses}
          kindFilter={testKindFilter}
          onKindFilterChange={(f) => (testKindFilter = f)}
          onchange={onVisualChange}
          onSelectTest={selectTest}
          onToggleCollapse={toggleCollapse}
          onRunTest={runSingleTest}
          onGenerateTests={handleGenerateTests}
        />
      {/if}

      <ResultsPanel
        projectId={activeProject?.id}
        open={resultsOpen}
        height={resultsHeight}
        {running}
        {runResult}
        onClose={() => { resultsOpen = false }}
        onResizeStart={() => { resizeResultsStart = resultsHeight }}
        onResize={(delta) => { resultsHeight = clamp(resizeResultsStart + delta, 120, 480) }}
      />
      <div class="shrink-0 border-t border-zinc-100 dark:border-zinc-800 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900">
        <button class="rounded px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 disabled:opacity-40" aria-pressed={resultsOpen} disabled={!runResult && !running} onclick={() => { resultsOpen = !resultsOpen }}>Results{#if running} · Running…{:else if runResult} · {runResult.passedTests}/{runResult.totalTests} passed{/if}</button>
      </div>
    </div>

    {#if inLessonMode && lessonReady && lessonId && sandboxProjectId}
      <LessonCoach
        lessonId={lessonId}
        fileContent={editorContent}
        sandboxProjectId={sandboxProjectId}
        resetting={lessonResetting}
        onReset={resetLessonFile}
      />
    {:else if outlineOpen}
      <div id="editor-outline" class="flex shrink-0 min-h-0" role="region" aria-label="Test outline">
      <ResizeHandle
        direction="horizontal"
        side="right"
        onResizeStart={() => { resizeOutlineStart = outlineWidth }}
        onResize={(delta) => { outlineWidth = clamp(resizeOutlineStart + delta, 180, 400) }}
      />

      <EditorOutline
        parsed={mode === 'visual' ? visualParsed : parsedContent}
        {runResult}
        {running}
        {selectedTestId}
        kindFilter={testKindFilter}
        onKindFilterChange={(f) => (testKindFilter = f)}
        width={outlineWidth}
        onSelectTest={selectTest}
      />
      </div>
    {/if}
  </div>
  {/if}
  </div>
</div>
