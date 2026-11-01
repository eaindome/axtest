import type {
  AuthResponse, LoginRequest, RegisterRequest,
  Workspace, Project, CreateProjectRequest,
  RunListItem, RunDetail, TestFile, RunFileRequest,
  ProjectEnvironment, UpsertEnvironmentRequest,
  ProjectExplorer, CreateFileRequest,
  RenameFileRequest, RenameFolderRequest, MoveFileRequest, MoveFolderRequest,
  GenerateTestsRequest, GenerateTestsResponse,
} from './types'

import { clearAuth } from '$lib/stores/auth'

export const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError' }
}
async function responseError(res: Response): Promise<never> {
  const body = await res.text()
  let message = body || `Request failed (${res.status}).`
  try {
    const problem = JSON.parse(body)
    const fields = Object.values(problem.errors ?? {}).flat().filter(v => typeof v === 'string')
    message = fields.length ? fields.join(' ') : problem.detail ?? problem.title ?? problem.error ?? (typeof problem === 'string' ? problem : message)
  } catch { /* An older API may return plain text. */ }
  throw new ApiError(message, res.status)
}
let csrfToken: string | null = null
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(options.method ?? 'GET')
  if (mutation && !csrfToken) await session()
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(mutation && csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}), ...options.headers } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Cannot reach the API. Start the backend and check VITE_API_URL, then try again.')
  }
  if (!res.ok) {
    if (res.status === 401 && path !== '/api/auth/login') {
      csrfToken = null; clearAuth()
      window.dispatchEvent(new Event('axtest:session-expired'))
    }
    return responseError(res)
  }
  if (res.status === 204) return undefined as T
  const result = await res.json()
  if (typeof result.csrfToken === 'string') csrfToken = result.csrfToken
  return result
}
export const session = () => request<import('./types').SessionResponse>('/api/auth/session')
export const logout = () => request<import('./types').SessionResponse>('/api/auth/logout', { method: 'POST' })
export const changePassword = (currentPassword: string, newPassword: string) => request<AuthResponse>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
export async function screenshotBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const url = new URL(path, API_BASE)
  if (url.origin !== new URL(API_BASE).origin || !/^\/api\/projects\/\d+\/runs\/\d+\/artifacts\//.test(url.pathname)) throw new Error('Invalid screenshot URL.')
  const response = await fetch(url, { credentials: 'include', signal })
  if (!response.ok) return responseError(response)
  return response.blob()
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

export const updateProject = (workspaceId: number, projectId: number, data: CreateProjectRequest) =>
  request<Project>(`/api/workspaces/${workspaceId}/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(data) })

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

export async function runFile(projectId: number, data: RunFileRequest, options: import('./types').RunExecutionOptions = {}): Promise<RunDetail> {
  let run = await request<RunDetail>(`/api/projects/${projectId}/runs/file?wait=false`, { method: 'POST', body: JSON.stringify(data), signal: options.signal })
  options.onProgress?.(run)
  const deadline = Date.now() + 15 * 60 * 1000
  while (run.status === 'pending' || run.status === 'running') {
    if (Date.now() > deadline) throw new Error(`Run ${run.id} is still in progress. Open project run history to follow it.`)
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('Polling stopped', 'AbortError')) }
      const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve() }, 1000)
      if (options.signal?.aborted) abort()
      else options.signal?.addEventListener('abort', abort, { once: true })
    })
    run = await request<RunDetail>(`/api/projects/${projectId}/runs/${run.id}`, { signal: options.signal })
    options.onProgress?.(run)
  }
  return run
}

export const getEnvironments = (projectId: number) =>
  request<ProjectEnvironment[]>(`/api/projects/${projectId}/environments`)

export const upsertEnvironment = (projectId: number, name: string, data: UpsertEnvironmentRequest) =>
  request<ProjectEnvironment[]>(`/api/projects/${projectId}/environments/${name}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })

export async function deleteEnvironment(projectId: number, name: string) {
  await request<void>(`/api/projects/${projectId}/environments/${name}`, { method: 'DELETE' })
  return getEnvironments(projectId)
}

export const forkTutorialSandbox = (workspaceId: number) =>
  request<import('./types').TutorialSandboxResponse>(
    `/api/workspaces/${workspaceId}/tutorial-sandbox`,
    { method: 'POST' },
  )

export const resetLessonFile = (projectId: number, data: import('./types').ResetLessonRequest) =>
  request<import('./types').TestFile>(
    `/api/projects/${projectId}/tutorial/reset-lesson`,
    { method: 'POST', body: JSON.stringify(data) },
  )
