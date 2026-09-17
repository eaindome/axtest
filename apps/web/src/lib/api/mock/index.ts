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
import { mockGetEnvironments, mockUpsertEnvironment, mockDeleteEnvironment } from './environments'
import { forkTutorialSandboxProject, getSandboxProjects, resetLessonStarter } from './tutorial-sandbox'

const delay = (ms = 350) => new Promise<void>(r => setTimeout(r, ms))

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
  return [...mockProjects, ...getSandboxProjects()]
}

export const createProject = async (_workspaceId: number, data: CreateProjectRequest): Promise<Project> => {
  await delay()
  return {
    id: 99,
    name: data.name,
    baseUrl: data.baseUrl ?? null,
    description: data.description ?? null,
    runCount: 0,
    systemCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export const getRuns = async (_projectId: number, _page = 1): Promise<RunListItem[]> => {
  await delay()
  return mockRuns
}

export const getRun = async (_projectId: number, id: number): Promise<RunDetail> => {
  await delay()
  return id === mockRunDetail.id ? mockRunDetail : { ...mockRunDetail, id }
}

export const getExplorer = async (projectId: number): Promise<ProjectExplorer> => {
  await delay(150)
  return mockGetExplorer(projectId)
}

export const getFiles = async (projectId: number): Promise<TestFile[]> => {
  await delay(150)
  return mockGetExplorer(projectId).files
}

export const saveFile = async (projectId: number, file: TestFile): Promise<TestFile> => {
  await delay(200)
  return mockSaveFile(projectId, file)
}

export const createFile = async (projectId: number, data: CreateFileRequest | string): Promise<TestFile> => {
  await delay(200)
  const req = typeof data === 'string' ? { name: data } : data
  return mockCreateFile(projectId, req.name, req.folder)
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

export const runFile = async (_projectId: number, req: RunFileRequest): Promise<RunDetail> => {
  return simulateFileRun(req.fileName, req.content, req.environment, 'ekow@ssmas.com', req.testNames)
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
