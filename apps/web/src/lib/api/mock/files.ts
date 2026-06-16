import type { ProjectExplorer, TestFile } from '../types'
import { mockFiles as seedFiles, mockTaskflowFiles } from './data'

export const DEFAULT_FOLDERS = ['auth', 'modules'] as const

const fileStore = new Map<number, TestFile[]>()
const folderStore = new Map<number, string[]>()

function foldersFromFiles(files: TestFile[]): string[] {
  const paths = new Set<string>()
  for (const f of files) {
    const parts = f.path.split('/').filter(Boolean)
    parts.pop()
    let built = ''
    for (const p of parts) {
      built = built ? `${built}/${p}` : p
      paths.add(built)
    }
  }
  return [...paths]
}

function ensureProject(projectId: number) {
  if (!fileStore.has(projectId)) {
    fileStore.set(
      projectId,
      projectId === 1 ? [...seedFiles]
      : projectId === 3 ? [...mockTaskflowFiles]
      : [],
    )
    folderStore.set(projectId, [])
  }
}

export function mockGetExplorer(projectId: number): ProjectExplorer {
  ensureProject(projectId)
  const files = fileStore.get(projectId)!
  const custom = folderStore.get(projectId)!
  const folders = [...new Set([...DEFAULT_FOLDERS, ...custom, ...foldersFromFiles(files)])].sort()
  return { files, folders }
}

export function mockSaveFile(projectId: number, file: TestFile): TestFile {
  ensureProject(projectId)
  const files = fileStore.get(projectId)!
  const idx = files.findIndex(f => f.id === file.id)
  const updated = { ...file, updatedAt: new Date().toISOString() }
  if (idx >= 0) files[idx] = updated
  else files.push(updated)
  return updated
}

const NEW_FILE_TEMPLATE = (title: string) => `---
title: ${title}
---

TEST "New test"
  STEPS
    navigate to "/"
  ASSERT
    assert page is_visible
`

export function mockCreateFile(
  projectId: number,
  name: string,
  folder?: string | null,
): TestFile {
  ensureProject(projectId)
  const safeName = name.endsWith('.axtest') ? name : `${name}.axtest`
  const dir = (folder ?? '').replace(/^\/+|\/+$/g, '')
  const path = dir ? `${dir}/${safeName}` : safeName
  const file: TestFile = {
    id: `file-${Date.now()}`,
    name: safeName,
    path,
    content: NEW_FILE_TEMPLATE(safeName),
    updatedAt: new Date().toISOString(),
  }
  fileStore.get(projectId)!.push(file)
  return file
}

export function mockCreateFolder(projectId: number, folderPath: string): ProjectExplorer {
  ensureProject(projectId)
  const normalized = folderPath.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  if (!normalized) return mockGetExplorer(projectId)
  const custom = folderStore.get(projectId)!
  if (!custom.includes(normalized)) custom.push(normalized)
  return mockGetExplorer(projectId)
}

function fileParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

function normalizePath(path?: string | null): string {
  return (path ?? '').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function remapFolderEntries(paths: string[], oldPrefix: string, newPrefix: string): string[] {
  const mapped = paths.map(p => {
    if (p === oldPrefix) return newPrefix
    if (p.startsWith(`${oldPrefix}/`)) return newPrefix + p.slice(oldPrefix.length)
    return p
  })
  return [...new Set(mapped)]
}

function remapFilesInFolder(files: TestFile[], oldPrefix: string, newPrefix: string): void {
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (f.path === oldPrefix || f.path.startsWith(`${oldPrefix}/`)) {
      const suffix = f.path === oldPrefix ? '' : f.path.slice(oldPrefix.length)
      files[i] = { ...f, path: newPrefix + suffix, updatedAt: new Date().toISOString() }
    }
  }
}

export function mockDeleteFile(projectId: number, fileId: string): ProjectExplorer {
  ensureProject(projectId)
  const files = fileStore.get(projectId)!
  fileStore.set(projectId, files.filter(f => f.id !== fileId))
  return mockGetExplorer(projectId)
}

export function mockRenameFile(projectId: number, fileId: string, name: string): TestFile {
  ensureProject(projectId)
  const files = fileStore.get(projectId)!
  const idx = files.findIndex(f => f.id === fileId)
  if (idx < 0) throw new Error('File not found')
  const safeName = name.endsWith('.axtest') ? name : `${name}.axtest`
  const dir = fileParentPath(files[idx].path)
  const path = dir ? `${dir}/${safeName}` : safeName
  if (files.some((f, i) => i !== idx && f.path === path)) throw new Error('A file with that name already exists')
  const updated = { ...files[idx], name: safeName, path, updatedAt: new Date().toISOString() }
  files[idx] = updated
  return updated
}

export function mockMoveFile(projectId: number, fileId: string, folder?: string | null): TestFile {
  ensureProject(projectId)
  const files = fileStore.get(projectId)!
  const idx = files.findIndex(f => f.id === fileId)
  if (idx < 0) throw new Error('File not found')
  const dir = normalizePath(folder)
  const name = files[idx].name
  const path = dir ? `${dir}/${name}` : name
  if (files.some((f, i) => i !== idx && f.path === path)) throw new Error('A file with that name already exists')
  const updated = { ...files[idx], path, updatedAt: new Date().toISOString() }
  files[idx] = updated
  return updated
}

export function mockDeleteFolder(projectId: number, folderPath: string): ProjectExplorer {
  ensureProject(projectId)
  const normalized = normalizePath(folderPath)
  if (!normalized) return mockGetExplorer(projectId)
  const files = fileStore.get(projectId)!
  fileStore.set(projectId, files.filter(f => !f.path.startsWith(`${normalized}/`)))
  const custom = folderStore.get(projectId)!
  folderStore.set(projectId, custom.filter(p => p !== normalized && !p.startsWith(`${normalized}/`)))
  return mockGetExplorer(projectId)
}

export function mockRenameFolder(projectId: number, folderPath: string, newName: string): ProjectExplorer {
  ensureProject(projectId)
  const normalized = normalizePath(folderPath)
  const safeName = newName.replace(/[/\\]/g, '').trim()
  if (!safeName) throw new Error('Invalid folder name')
  const parent = fileParentPath(normalized)
  const newPath = parent ? `${parent}/${safeName}` : safeName
  if (newPath === normalized) return mockGetExplorer(projectId)
  const files = fileStore.get(projectId)!
  remapFilesInFolder(files, normalized, newPath)
  const custom = folderStore.get(projectId)!
  folderStore.set(projectId, remapFolderEntries(custom, normalized, newPath))
  return mockGetExplorer(projectId)
}

export function mockMoveFolder(projectId: number, folderPath: string, targetFolder?: string | null): ProjectExplorer {
  ensureProject(projectId)
  const normalized = normalizePath(folderPath)
  const target = normalizePath(targetFolder)
  if (target === normalized || target.startsWith(`${normalized}/`)) {
    throw new Error('Cannot move folder into itself')
  }
  const folderName = normalized.split('/').pop()!
  const newPath = target ? `${target}/${folderName}` : folderName
  if (newPath === normalized) return mockGetExplorer(projectId)
  const files = fileStore.get(projectId)!
  remapFilesInFolder(files, normalized, newPath)
  const custom = folderStore.get(projectId)!
  folderStore.set(projectId, remapFolderEntries(custom, normalized, newPath))
  return mockGetExplorer(projectId)
}
