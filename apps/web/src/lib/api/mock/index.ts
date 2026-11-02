import type {
  AuthResponse, LoginRequest, RegisterRequest,
  Workspace, Project, CreateProjectRequest,
  RunListItem, RunDetail, TestFile, RunFileRequest,
  ProjectEnvironment, UpsertEnvironmentRequest,
  ProjectExplorer, CreateFileRequest,
  RenameFileRequest, RenameFolderRequest, MoveFileRequest, MoveFolderRequest,
  GenerateTestsRequest, GenerateTestsResponse,
  TutorialSandboxResponse, ResetLessonRequest,
} from '../types'
import { mockUser, mockToken, mockWorkspaces, mockProjects, mockRuns, mockRunDetail } from './data'
import { mockGetExplorer, mockSaveFile, mockCreateFile, mockCreateFolder, mockDeleteFile, mockRenameFile, mockMoveFile, mockDeleteFolder, mockRenameFolder, mockMoveFolder } from './files'
import { simulateFileRun } from './run-file'
import { mockGenerateTests } from './generate-tests'
import { discoverSuites, selectedExecution } from '$lib/suites'
import { mockGetEnvironments, mockUpsertEnvironment, mockDeleteEnvironment } from './environments'
import { forkTutorialSandboxProject, getSandboxProjects, resetLessonStarter } from './tutorial-sandbox'

const delay = (ms = 350) => new Promise<void>(r => setTimeout(r, ms))
const suiteAccounts = new Map<number, import('../types').TestAccount[]>()
const suiteResults = new Map<number, RunDetail>()
let nextSuiteRun = 100000
const deletedProjects = new Set<number>()
export const getTestAccounts = async (projectId: number) => { await delay(100); return suiteAccounts.get(projectId) ?? [] }
export const saveTestAccount = async (projectId: number, data: import('../types').SaveTestAccountRequest) => {
  const environments = await getEnvironments(projectId)
  const account: import('../types').TestAccount = { id: crypto.randomUUID(), name: data.name, environment: data.environment, targetUrl: (environments.find(env => env.name === data.environment)?.effectiveUrl ?? '').replace(/\/$/, ''), variableNames: Object.keys(data.variables), updatedAt: new Date().toISOString() }
  suiteAccounts.set(projectId, [...suiteAccounts.get(projectId) ?? [], account])
  return account
}
export const deleteTestAccount = async (projectId: number, id: string) => {
  suiteAccounts.set(projectId, (suiteAccounts.get(projectId) ?? []).filter(account => account.id !== id))
  for (const [key, setup] of projectSetups) if (key.startsWith(`${projectId}:`) && setup.defaultAccountId === id) projectSetups.set(key, { ...setup, defaultAccountId: null })
}
export const runSuites = async (projectId: number, data: import('../types').RunSuitesRequest): Promise<RunListItem[]> => {
  const files = (await getExplorer(projectId)).files
  const runs: RunDetail[] = []
  const suites = discoverSuites(files)
  const plan = selectedExecution(files, Object.fromEntries(data.files.map(choice => [choice.fileId, choice.testNames ?? suites.find(file => file.id === choice.fileId)?.parsed.tests.map(test => test.name) ?? []])))
  if (plan.errors.length) throw new Error(plan.errors.join(' '))
  for (const choice of data.files) {
    const file = files.find(file => file.id === choice.fileId)
    if ([...mockProjects, ...getSandboxProjects()].find(project => project.id === projectId)?.archivedAt) throw new Error('Restore this project before starting a run.')
    if (!file) throw new Error('Suite file not found.')
    const result = await simulateFileRun(file.path, file.content, data.environment, 'suite', plan.entries.find(entry => entry.file.id === file.id)?.tests.map(test => test.name) ?? choice.testNames)
    result.id = nextSuiteRun++; result.suiteName = file.path
    suiteResults.set(result.id, result); runs.push(result)
  }
  return runs
}

export const login = async (_data: LoginRequest): Promise<AuthResponse> => {
  await delay()
  return { token: mockToken, user: mockUser }
}

export const register = async (_data: RegisterRequest): Promise<AuthResponse> => {
  await delay()
  return { token: mockToken, user: mockUser }
}

export const getWorkspaces = async (): Promise<Workspace[]> => {
  await delay()
  return mockWorkspaces
}

export const createWorkspace = async (name: string): Promise<Workspace> => {
  await delay()
  return { id: 99, name, memberCount: 1, projectCount: 0, createdAt: new Date().toISOString() }
}

export const getProjects = async (_workspaceId: number): Promise<Project[]> => {
  await delay()
  return [...mockProjects, ...getSandboxProjects()].filter(project => !deletedProjects.has(project.id))
}

export const createProject = async (_workspaceId: number, data: CreateProjectRequest): Promise<Project> => {
  await delay()
  const project: Project = {
    id: 10000 + mockProjects.length,
    name: data.name,
    baseUrl: data.baseUrl ?? null,
    description: data.description ?? null,
    runCount: 0,
    systemCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  mockProjects.push(project)
  return project
}

export const updateProject = async (_workspaceId: number, projectId: number, data: CreateProjectRequest): Promise<Project> => {
  await delay()
  const project = [...mockProjects, ...getSandboxProjects()].find(project => project.id === projectId)
  if (!project) throw new Error('Project not found.')
  Object.assign(project, { name: data.name, baseUrl: data.baseUrl ?? null, description: data.description ?? null, updatedAt: new Date().toISOString() })
  return { ...project }
}

export const archiveProject = async (_workspaceId: number, projectId: number) => {
  await delay()
  const project = [...mockProjects, ...getSandboxProjects()].find(item => item.id === projectId)
  if (!project) throw new Error('Project not found.')
  project.archivedAt = new Date().toISOString()
}
export const restoreProject = async (_workspaceId: number, projectId: number) => {
  await delay()
  const project = [...mockProjects, ...getSandboxProjects()].find(item => item.id === projectId)
  if (!project) throw new Error('Project not found.')
  project.archivedAt = null
}
export const deleteProject = async (_workspaceId: number, projectId: number) => {
  await delay()
  const project = [...mockProjects, ...getSandboxProjects()].find(item => item.id === projectId)
  if (!project?.archivedAt) throw new Error('Archive the project before permanently deleting it.')
  deletedProjects.add(projectId)
}

export const getRuns = async (_projectId: number, _page = 1): Promise<RunListItem[]> => {
  await delay()
  return mockRuns
}

export const getRun = async (_projectId: number, id: number): Promise<RunDetail> => {
  await delay()
  return suiteResults.get(id) ?? (id === mockRunDetail.id ? mockRunDetail : { ...mockRunDetail, id })
}

export const getExplorer = async (projectId: number): Promise<ProjectExplorer> => {
  await delay(150)
  return mockGetExplorer(projectId)
}

export const getFiles = async (projectId: number): Promise<TestFile[]> => {
  await delay(150)
  return mockGetExplorer(projectId).files
}

export const saveFile = async (projectId: number, file: TestFile, expectedUpdatedAt?: string): Promise<TestFile> => {
  await delay(200)
  if (expectedUpdatedAt && mockGetExplorer(projectId).files.find(item => item.id === file.id)?.updatedAt !== expectedUpdatedAt) throw new Error('This suite changed since you opened it. Reopen the test before saving so other edits are preserved.')
  return mockSaveFile(projectId, file)
}

export const createFile = async (projectId: number, data: CreateFileRequest | string): Promise<TestFile> => {
  await delay(200)
  const req = typeof data === 'string' ? { name: data } : data
  const file = mockCreateFile(projectId, req.name, req.folder)
  return req.content === undefined ? file : mockSaveFile(projectId, { ...file, content: req.content })
}

export const createFolder = async (projectId: number, path: string): Promise<ProjectExplorer> => {
  await delay(150)
  return mockCreateFolder(projectId, path)
}

export const deleteFile = async (projectId: number, fileId: string): Promise<ProjectExplorer> => {
  await delay(150)
  return mockDeleteFile(projectId, fileId)
}

export const renameFile = async (projectId: number, fileId: string, data: RenameFileRequest): Promise<TestFile> => {
  await delay(150)
  return mockRenameFile(projectId, fileId, data.name)
}

export const moveFile = async (projectId: number, fileId: string, data: MoveFileRequest): Promise<TestFile> => {
  await delay(150)
  return mockMoveFile(projectId, fileId, data.folder)
}

export const deleteFolder = async (projectId: number, path: string): Promise<ProjectExplorer> => {
  await delay(150)
  return mockDeleteFolder(projectId, path)
}

export const renameFolder = async (projectId: number, path: string, data: RenameFolderRequest): Promise<ProjectExplorer> => {
  await delay(150)
  return mockRenameFolder(projectId, path, data.name)
}

export const moveFolder = async (projectId: number, path: string, data: MoveFolderRequest): Promise<ProjectExplorer> => {
  await delay(150)
  return mockMoveFolder(projectId, path, data.targetFolder)
}

export const generateTests = async (_projectId: number, data: GenerateTestsRequest): Promise<GenerateTestsResponse> => {
  await delay(400)
  return mockGenerateTests(data)
}

export const runFile = async (_projectId: number, req: RunFileRequest, options: import('../types').RunExecutionOptions = {}): Promise<RunDetail> => {
  if ([...mockProjects, ...getSandboxProjects()].find(project => project.id === _projectId)?.archivedAt) throw new Error('Restore this project before starting a run.')
  const result = await simulateFileRun(req.fileName, req.content, req.environment, 'ekow@ssmas.com', req.testNames)
  options.signal?.throwIfAborted()
  options.onProgress?.(result)
  return result
}

export const getEnvironments = async (projectId: number): Promise<ProjectEnvironment[]> => {
  await delay(120)
  const project = [...mockProjects, ...getSandboxProjects()].find(p => p.id === projectId)
  if (!project) return []
  return mockGetEnvironments(project)
}

export const upsertEnvironment = async (
  projectId: number,
  name: 'staging' | 'local',
  data: UpsertEnvironmentRequest,
): Promise<ProjectEnvironment[]> => {
  await delay(150)
  const project = [...mockProjects, ...getSandboxProjects()].find(p => p.id === projectId)
  if (!project) return []
  return mockUpsertEnvironment(project, name, data)
}

export const deleteEnvironment = async (
  projectId: number,
  name: 'staging' | 'local',
): Promise<ProjectEnvironment[]> => {
  await delay(120)
  const project = [...mockProjects, ...getSandboxProjects()].find(p => p.id === projectId)
  if (!project) return []
  return mockDeleteEnvironment(project, name)
}

export const forkTutorialSandbox = async (_workspaceId: number): Promise<TutorialSandboxResponse> => {
  await delay(300)
  const project = forkTutorialSandboxProject()
  return { project }
}

export const resetLessonFile = async (
  projectId: number,
  data: ResetLessonRequest,
): Promise<TestFile> => {
  await delay(200)
  return resetLessonStarter(projectId, data.lessonId)
}

const projectSetups = new Map<string, import('../types').ProjectSetup>()
export const getProjectSetup = async (projectId: number, environment: import('../types').EnvironmentName): Promise<import('../types').ProjectSetup> => {
  await delay(100)
  return projectSetups.get(`${projectId}:${environment}`) ?? { environment, loginRequired: null, loginFlowId: null, defaultAccountId: null }
}
export const saveProjectSetup = async (projectId: number, environment: import('../types').EnvironmentName, data: Omit<import('../types').ProjectSetup, 'environment'>) => {
  await delay(100)
  const saved = { ...data, environment }; projectSetups.set(`${projectId}:${environment}`, saved); return saved
}
export const checkProjectConnection = async (_projectId: number, _environment: string): Promise<import('../types').AccessCheck> => ({ ok: false, url: '', message: 'Use API mode to check the real application.' })
export const checkProjectLogin = async (_projectId: number, _environment: string, _accountId?: string): Promise<import('../types').AccessCheck> => ({ ok: false, url: '', message: 'Use API mode to check the real application.' })
export const updateTestAccount = async (projectId: number, id: string, data: import('../types').SaveTestAccountRequest) => {
  await delay(100)
  const saved = suiteAccounts.get(projectId)?.find(account => account.id === id)
  if (!saved) throw new Error('Account not found.')
  const url = (await getEnvironments(projectId)).find(env => env.name === data.environment)?.effectiveUrl ?? ''
  const updated = { ...saved, name: data.name, targetUrl: url.replace(/\/$/, ''), variableNames: [...new Set([...saved.variableNames, ...Object.keys(data.variables)])], updatedAt: new Date().toISOString() }
  suiteAccounts.set(projectId, (suiteAccounts.get(projectId) ?? []).map(account => account.id === id ? updated : account)); return updated
}
