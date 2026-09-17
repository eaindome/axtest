<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import { currentWorkspace } from '$lib/stores/workspace'
  import { parseAxtest } from '$lib/editor/parse-axtest'
  import { validateAxtest } from '$lib/editor/validate-axtest'
  import { countDiagnostics } from '$lib/editor/axtest-lint'
  import type { Diagnostic } from '@codemirror/lint'
  import { loadPanelSizes, savePanelSizes, clamp, type FileStatusInfo, type FileRunStatus } from '$lib/editor/editor-panels'
  import { parentFolderPath } from '$lib/editor/file-tree'
  import type { ParsedFile } from '$lib/editor/types'
  import type { Project, TestFile, RunDetail, ProjectEnvironment, EnvironmentName } from '$lib/api'
  import type { TestKindFilter } from '$lib/editor/test-kind'
  import { resolveEffectiveUrl, needsEnvironmentSetup, isOverridableEnv } from '$lib/editor/resolve-env-url'

  import EditorToolbar from '$lib/components/editor/EditorToolbar.svelte'
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

  let projects       = $state<Project[]>([])
  let activeProject  = $state<Project | null>(null)
  let files          = $state<TestFile[]>([])
  let explorerFolders = $state<string[]>([])
  let activeFile     = $state<TestFile | null>(null)
  let editorContent  = $state('')
  let dirty          = $state(false)
  let dirtyFileIds   = $state<Set<string>>(new Set())
  let fileRunStatus  = $state<Record<string, FileRunStatus>>({})
  let saving         = $state(false)
  let running        = $state(false)
  let loadingFiles   = $state(true)
  let runResult      = $state<RunDetail | null>(null)
  let resultsOpen    = $state(false)
  let resultsHeight  = $state(savedPanels.results)
  let explorerWidth  = $state(savedPanels.explorer)
  let outlineWidth   = $state(savedPanels.outline)
  let mode           = $state<'code' | 'visual'>('code')
  let environment    = $state<EnvironmentName>('staging')
  let projectEnvironments = $state<ProjectEnvironment[]>([])
  let envModalOpen = $state(false)
  let envModalMode = $state<'setup' | 'edit'>('setup')
  let envModalEnvironment = $state<'staging' | 'local'>('staging')
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
  const paramMode = $derived(() => $page.url.searchParams.get('mode') as 'code' | 'visual' | null)
  const inLessonMode = $derived(!!lessonId && isTutorialLessonId(lessonId))

  const validation = $derived(countDiagnostics(validateAxtest(editorContent)))
  const editorDiagnostics = $derived(validateAxtest(editorContent))

  let codeEditor = $state<{ focusDiagnostic: (d: Diagnostic[], i: number, s?: 'error' | 'warning') => number } | undefined>()
  let diagnosticJumpIndex = $state(0)

  const testStatuses = $derived.by(() => {
    if (!runResult) return {} as Record<string, 'passed' | 'failed'>
    const parsed = visualParsed ?? parseAxtest(editorContent)
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
    savePanelSizes({ explorer: explorerWidth, outline: outlineWidth, results: resultsHeight })
  })

  $effect(() => {
    const ws = $currentWorkspace
    const lessonParam = paramLessonId()
    if (!ws) return

    if (lessonParam && isTutorialLessonId(lessonParam) && lessonParam !== lessonId && !lessonBooting) {
      bootLessonPractice(lessonParam)
      return
    }

    if (!lessonParam && lessonId) {
      lessonId = null
      lessonReady = false
      sandboxProjectId = null
    }

    if (!lessonParam && !lessonBooting) {
      loadProjects(ws.id)
    }
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

  function openEnvModal(mode: 'setup' | 'edit', env: 'staging' | 'local') {
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
    environment = env as EnvironmentName
    if (isOverridableEnv(env) && needsEnvironmentSetup(env, projectEnvironments)) {
      openEnvModal('setup', env)
    }
  }

  function openEditEnvironmentModal() {
    if (!isOverridableEnv(environment)) return
    openEnvModal(environmentNeedsSetup ? 'setup' : 'edit', environment)
  }

  async function saveEnvironmentUrl(url: string) {
    if (!activeProject) return
    await finishEnvModal(async () => {
      projectEnvironments = await api().upsertEnvironment(activeProject!.id, envModalEnvironment, {
        baseUrl: url,
        useProductionFallback: false,
      })
    })
  }

  async function useProductionForEnvironment() {
    if (!activeProject) return
    await finishEnvModal(async () => {
      projectEnvironments = await api().upsertEnvironment(activeProject!.id, envModalEnvironment, {
        useProductionFallback: true,
      })
    })
  }

  async function deleteEnvironmentOverride() {
    if (!activeProject) return
    await finishEnvModal(async () => {
      projectEnvironments = await api().deleteEnvironment(activeProject!.id, envModalEnvironment)
    })
  }

  async function loadProjects(workspaceId: number) {
    try {
      const projs = await api().getProjects(workspaceId)
      projects = projs
      const pid = paramProjectId()
      const target = pid ? projs.find(p => p.id === pid) : projs[0]
      if (target) await selectProject(target)
    } catch {}
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
    } catch {}
    lessonResetting = false
  }

  async function selectProject(project: Project, preferredFilePath?: string | null) {
    activeProject = project
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
      if (files.length > 0) {
        const targetPath = preferredFilePath ?? paramFilePath()
        const fromQuery = targetPath
          ? files.find(f => f.path === targetPath || f.name === targetPath)
          : null
        selectFile(fromQuery ?? files[0])
      }
    } catch {}
    loadingFiles = false
  }

  function selectFile(file: TestFile) {
    if (dirty && activeFile) saveFile()
    activeFile = file
    editorContent = file.content
    dirty = false
    runResult = null
    resultsOpen = false
    selectedTestId = null
    testKindFilter = 'all'
    if (mode === 'visual') visualParsed = parseAxtest(file.content)
  }

  function markDirty() {
    dirty = true
    if (activeFile) {
      dirtyFileIds = new Set([...dirtyFileIds, activeFile.id])
    }
  }

  function onEdit(content: string) {
    editorContent = content
    markDirty()
    if (mode === 'visual') visualParsed = parseAxtest(content)
  }

  async function saveFile() {
    if (!activeProject || !activeFile || !dirty) return
    saving = true
    try {
      const updated = await api().saveFile(activeProject.id, { ...activeFile, content: editorContent })
      files = files.map(f => f.id === updated.id ? updated : f)
      activeFile = updated
      dirty = false
      const next = new Set(dirtyFileIds)
      next.delete(updated.id)
      dirtyFileIds = next
    } catch {}
    saving = false
  }

  async function runTests() {
    if (!activeProject || !activeFile) return
    await withEnvironmentReady(async () => {
      if (dirty) await saveFile()
      running = true
      resultsOpen = true
      runResult = null
      try {
        const result = await api().runFile(activeProject!.id, {
          fileId: activeFile!.id,
          fileName: activeFile!.name,
          content: editorContent,
          environment,
        })
        runResult = result
        const status: FileRunStatus =
          result.failedTests === 0 ? 'passed'
          : result.passedTests === 0 ? 'failed'
          : 'partial'
        fileRunStatus = { ...fileRunStatus, [activeFile!.id]: status }
      } catch {}
      running = false
    })
  }

  function switchToVisual() {
    visualParsed = parseAxtest(editorContent)
    mode = 'visual'
  }

  function switchToCode() {
    mode = 'code'
  }

  function onVisualChange(content: string, parsed?: ParsedFile) {
    editorContent = content
    markDirty()
    if (parsed) visualParsed = parsed
  }

  function selectTest(testId: string) {
    selectedTestId = testId
    if (mode === 'visual') {
      document.getElementById(`test-${testId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function toggleCollapse(testId: string) {
    const next = new Set(collapsedTests)
    if (next.has(testId)) next.delete(testId)
    else next.add(testId)
    collapsedTests = next
  }

  async function runSingleTest(testId: string) {
    if (!activeProject || !activeFile) return
    await withEnvironmentReady(async () => {
      runningTestId = testId
      try {
        const parsed = parseAxtest(editorContent)
        const test = parsed.tests.find(t => t.id === testId)
        if (!test) return
        if (dirty) await saveFile()
        resultsOpen = true
        running = true
        runResult = await api().runFile(activeProject!.id, {
          fileId: activeFile!.id,
          fileName: activeFile!.name,
          content: editorContent,
          environment,
          testNames: [test.name],
        })
      } catch {}
      running = false
      runningTestId = null
    })
  }

  async function handleGenerateTests(testId: string) {
    if (!activeProject || !activeFile) return
    generatingTestId = testId
    try {
      if (dirty) await saveFile()
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
    } catch {}
    generatingTestId = null
  }

  async function handleCreateFile(name: string, folder: string | null) {
    if (!activeProject) return
    try {
      const file = await api().createFile(activeProject.id, { name, folder })
      const explorer = await api().getExplorer(activeProject.id)
      files = explorer.files
      explorerFolders = explorer.folders
      selectFile(file)
    } catch {}
  }

  async function handleCreateFolder(path: string) {
    if (!activeProject) return
    try {
      const explorer = await api().createFolder(activeProject.id, path)
      files = explorer.files
      explorerFolders = explorer.folders
    } catch {}
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
    } catch {}
  }

  async function handleRenameFile(fileId: string, name: string) {
    if (!activeProject) return
    try {
      const updated = await api().renameFile(activeProject.id, fileId, { name })
      files = files.map(f => f.id === updated.id ? updated : f)
      if (activeFile?.id === fileId) activeFile = updated
    } catch {}
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
    } catch {}
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
    } catch {}
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
    } catch {}
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
    } catch {}
  }

  onMount(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
</script>

<div class="flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">

  {#if lessonBooting}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-sm text-zinc-500">Preparing your tutorial sandbox…</p>
    </div>
  {:else}

  <EditorToolbar
    {activeProject}
    {projects}
    {activeFile}
    {dirty}
    {saving}
    {running}
    {mode}
    {environment}
    {effectiveUrl}
    {environmentNeedsSetup}
    validationErrors={validation.errors}
    validationWarnings={validation.warnings}
    onJumpToError={() => jumpToValidationIssue('error')}
    onJumpToWarning={() => jumpToValidationIssue('warning')}
    onSelectProject={selectProject}
    onSwitchCode={switchToCode}
    onSwitchVisual={switchToVisual}
    onSave={saveFile}
    onRun={runTests}
    onEnvironmentChange={handleEnvironmentChange}
    onEditEnvironment={openEditEnvironmentModal}
  />

  <EnvironmentSetupModal
    open={envModalOpen}
    environment={envModalEnvironment}
    project={activeProject}
    mode={envModalMode}
    currentUrl={envModalConfig?.baseUrl}
    useProductionFallback={envModalConfig?.useProductionFallback ?? false}
    onSave={saveEnvironmentUrl}
    onUseProduction={useProductionForEnvironment}
    onDelete={envModalMode === 'edit' ? deleteEnvironmentOverride : undefined}
    onCancel={closeEnvModal}
  />

  <div class="flex flex-1 overflow-hidden min-h-0">

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

    <!-- Center: editor canvas + results -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      {#if !activeFile}
        <div class="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <div class="size-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <svg class="size-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Select a spec file to edit</p>
            <p class="text-xs text-zinc-400 mt-1">Choose from the explorer or create a new file</p>
          </div>
        </div>

      {:else if mode === 'code'}
        <div class="flex-1 min-h-0 overflow-hidden">
          <CodeEditor bind:this={codeEditor} value={editorContent} onchange={onEdit} onsave={saveFile} />
        </div>

      {:else if visualParsed}
        <VisualBuilder
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
        open={resultsOpen}
        height={resultsHeight}
        {running}
        {runResult}
        onClose={() => { resultsOpen = false; runResult = null }}
        onResizeStart={() => { resizeResultsStart = resultsHeight }}
        onResize={(delta) => { resultsHeight = clamp(resizeResultsStart + delta, 120, 480) }}
      />
    </div>

    {#if inLessonMode && lessonReady && lessonId && sandboxProjectId}
      <LessonCoach
        lessonId={lessonId}
        fileContent={editorContent}
        sandboxProjectId={sandboxProjectId}
        resetting={lessonResetting}
        onReset={resetLessonFile}
      />
    {:else}
      <ResizeHandle
        direction="horizontal"
        side="right"
        onResizeStart={() => { resizeOutlineStart = outlineWidth }}
        onResize={(delta) => { outlineWidth = clamp(resizeOutlineStart + delta, 180, 400) }}
      />

      <EditorOutline
        parsed={mode === 'visual' ? visualParsed : parseAxtest(editorContent)}
        {runResult}
        {running}
        {selectedTestId}
        kindFilter={testKindFilter}
        onKindFilterChange={(f) => (testKindFilter = f)}
        width={outlineWidth}
        onSelectTest={selectTest}
      />
    {/if}
  </div>
  {/if}
</div>
