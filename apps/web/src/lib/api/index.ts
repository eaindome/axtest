import { get } from 'svelte/store'
import { useMock } from '$lib/stores/dev'
import * as real from './real'
import * as mock from './mock'

export function api() {
  return get(useMock) ? mock : real
}

export type {
  User, Workspace, Project, RunListItem, RunDetail,
  ResultItem, AuthResponse, LoginRequest, RegisterRequest,
  CreateProjectRequest, TestFile, RunFileRequest,
  ProjectEnvironment, UpsertEnvironmentRequest, EnvironmentName,
  ProjectExplorer, CreateFileRequest,
  RenameFileRequest, RenameFolderRequest, MoveFileRequest, MoveFolderRequest,
  GenerateTestsRequest, GenerateTestsResponse,
} from './types'
