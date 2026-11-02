export interface User {
  id: number
  name: string
  username: string
}

export interface Workspace {
  id: number
  name: string
  memberCount: number
  projectCount: number
  createdAt: string
}

export interface Project {
  archivedAt?: string | null
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
  errorMessage?: string | null
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
  screenshotUrl?: string | null
  skipReason?: string | null
  steps?: { raw: string; status: string; durationMs: number; error?: string | null; screenshotUrl?: string | null }[]
}

export interface RunDetail extends RunListItem {
  results: ResultItem[]
}

export interface TestAccount { id: string; name: string; environment: EnvironmentName; targetUrl: string; variableNames: string[]; updatedAt: string }
export interface SaveTestAccountRequest { name: string; environment: EnvironmentName; variables: Record<string, string> }
export interface RunSuitesRequest { environment: EnvironmentName; files: { fileId: string; testNames?: string[] }[]; accountId?: string; headed?: boolean; variables?: Record<string, string> }

export interface AuthResponse {
  token?: string
  csrfToken?: string
  user: User
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  name: string
  username: string
  password: string
}

export interface CreateProjectRequest {
  name: string
  baseUrl?: string
  description?: string
}

export interface CreateFileRequest {
  content?: string
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
  variables?: Record<string, string>
  headed?: boolean
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

export interface TutorialSandboxResponse {
  project: Project
}

export interface ResetLessonRequest {
  lessonId: string
}

export interface RunExecutionOptions {
  signal?: AbortSignal
  onProgress?: (run: RunDetail) => void
}

export interface SessionResponse { user: User | null; csrfToken: string; expiresAt?: string | null }

export interface ProjectSetup { environment: EnvironmentName; loginRequired: boolean | null; loginFlowId: string | null; defaultAccountId: string | null }
export interface AccessCheck { ok: boolean; url: string; message: string; statusCode?: number; detail?: string | null }
