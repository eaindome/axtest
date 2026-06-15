import type {
  AuthResponse, LoginRequest, RegisterRequest,
  Workspace, Project, CreateProjectRequest,
  RunListItem, RunDetail, TestFile, RunFileRequest,
  ProjectEnvironment, UpsertEnvironmentRequest,
  ProjectExplorer, CreateFileRequest,
  RenameFileRequest, RenameFolderRequest, MoveFileRequest, MoveFolderRequest,
  GenerateTestsRequest, GenerateTestsResponse,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('axtest_token') : null
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export const login = (data: LoginRequest) =>
  request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) })

export const register = (data: RegisterRequest) =>
  request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) })

export const getWorkspaces = () =>
  request<Workspace[]>('/api/workspaces')

export const createWorkspace = (name: string) =>
  request<Workspace>('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) })

export const getProjects = (workspaceId: number) =>
  request<Project[]>(`/api/workspaces/${workspaceId}/projects`)

export const createProject = (workspaceId: number, data: CreateProjectRequest) =>
  request<Project>(`/api/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const getRuns = (projectId: number, page = 1) =>
  request<RunListItem[]>(`/api/projects/${projectId}/runs?page=${page}`)

export const getRun = (projectId: number, id: number) =>
  request<RunDetail>(`/api/projects/${projectId}/runs/${id}`)

export const getExplorer = (projectId: number) =>
  request<ProjectExplorer>(`/api/projects/${projectId}/explorer`)

export const getFiles = async (projectId: number) =>
  (await getExplorer(projectId)).files

export const saveFile = (projectId: number, file: TestFile) =>
  request<TestFile>(`/api/projects/${projectId}/files/${file.id}`, {
    method: 'PUT',
    body: JSON.stringify(file)
  })

export const createFile = (projectId: number, data: CreateFileRequest | string) =>
  request<TestFile>(`/api/projects/${projectId}/files`, {
    method: 'POST',
    body: JSON.stringify(typeof data === 'string' ? { name: data } : data)
  })

export const createFolder = (projectId: number, path: string) =>
  request<ProjectExplorer>(`/api/projects/${projectId}/folders`, {
    method: 'POST',
    body: JSON.stringify({ path })
  })

export const deleteFile = (projectId: number, fileId: string) =>
  request<ProjectExplorer>(`/api/projects/${projectId}/files/${fileId}`, { method: 'DELETE' })

export const renameFile = (projectId: number, fileId: string, data: RenameFileRequest) =>
  request<TestFile>(`/api/projects/${projectId}/files/${fileId}/rename`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })

export const moveFile = (projectId: number, fileId: string, data: MoveFileRequest) =>
  request<TestFile>(`/api/projects/${projectId}/files/${fileId}/move`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })

export const deleteFolder = (projectId: number, path: string) =>
  request<ProjectExplorer>(`/api/projects/${projectId}/folders`, {
    method: 'DELETE',
    body: JSON.stringify({ path })
  })

export const renameFolder = (projectId: number, path: string, data: RenameFolderRequest) =>
  request<ProjectExplorer>(`/api/projects/${projectId}/folders/rename`, {
    method: 'PATCH',
    body: JSON.stringify({ path, name: data.name })
  })

export const moveFolder = (projectId: number, path: string, data: MoveFolderRequest) =>
  request<ProjectExplorer>(`/api/projects/${projectId}/folders/move`, {
    method: 'PATCH',
    body: JSON.stringify({ path, targetFolder: data.targetFolder ?? null })
  })

export const generateTests = (projectId: number, data: GenerateTestsRequest) =>
  request<GenerateTestsResponse>(`/api/projects/${projectId}/generate-tests`, {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const runFile = (projectId: number, data: RunFileRequest) =>
  request<RunDetail>(`/api/projects/${projectId}/runs/file`, {
    method: 'POST',
    body: JSON.stringify(data)
  })

export const getEnvironments = (projectId: number) =>
  request<ProjectEnvironment[]>(`/api/projects/${projectId}/environments`)

export const upsertEnvironment = (projectId: number, name: string, data: UpsertEnvironmentRequest) =>
  request<ProjectEnvironment[]>(`/api/projects/${projectId}/environments/${name}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })

export async function deleteEnvironment(projectId: number, name: string) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('axtest_token') : null
  const res = await fetch(`${BASE}/api/projects/${projectId}/environments/${name}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return getEnvironments(projectId)
}
