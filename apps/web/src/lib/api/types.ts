export interface User {
  id: number
  name: string
  email: string
}

export interface Workspace {
  id: number
  name: string
  memberCount: number
  projectCount: number
  createdAt: string
}

export interface Project {
  id: number
  name: string
  baseUrl: string | null
  description: string | null
  runCount: number
  systemCount: number
  createdAt: string
  updatedAt: string
}

export interface RunListItem {
  id: number
  status: 'passed' | 'failed' | 'running' | 'pending'
  environment: string
  totalTests: number
  passedTests: number
  failedTests: number
  durationMs: number
  suiteName: string | null
  triggeredBy: string
  startedAt: string
  completedAt: string | null
}

export interface ResultItem {
  id: number
  testId: string
  testName: string
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  errorMessage: string | null
  failedStep: string | null
  order: number
}

export interface RunDetail extends RunListItem {
  results: ResultItem[]
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface CreateProjectRequest {
  name: string
  baseUrl?: string
  description?: string
}

export interface CreateFileRequest {
  name: string
  /** Parent folder path, e.g. `auth` or `modules`. Omit for project root. */
  folder?: string | null
}

export interface RenameFileRequest {
  name: string
}

export interface RenameFolderRequest {
  name: string
}

export interface MoveFileRequest {
  /** Target folder path. Omit or null for project root. */
  folder?: string | null
}

export interface MoveFolderRequest {
  /** Parent folder path. Omit or null for project root. */
  targetFolder?: string | null
}

export interface ProjectExplorer {
  files: TestFile[]
  folders: string[]
}

export interface GenerateTestsRequest {
  fileId: string
  content: string
  seedTestId: string
}

export interface GenerateTestsResponse {
  content: string
  generatedCount: number
}

export interface TestFile {
  id: string
  name: string
  path: string
  content: string
  updatedAt: string
}

export interface RunFileRequest {
  fileId: string
  fileName: string
  content: string
  environment: string
  testNames?: string[]
}

export type EnvironmentName = 'production' | 'staging' | 'local'

export interface ProjectEnvironment {
  name: EnvironmentName
  baseUrl: string | null
  useProductionFallback: boolean
  effectiveUrl: string
  configured: boolean
}

export interface UpsertEnvironmentRequest {
  baseUrl?: string | null
  useProductionFallback: boolean
}
