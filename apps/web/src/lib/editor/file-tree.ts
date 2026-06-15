import type { TestFile } from '$lib/api'
import type { TreeNode } from './types'

export const DEFAULT_FOLDERS = ['auth', 'modules'] as const

export function normalizeFolderPath(path?: string | null): string {
  return (path ?? '').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

export function parentFolderPath(path: string): string | null {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return null
  parts.pop()
  return parts.join('/')
}

export function folderNameFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function isFolderAncestor(ancestor: string, descendant: string): boolean {
  const a = normalizeFolderPath(ancestor)
  const d = normalizeFolderPath(descendant)
  if (!a || !d) return false
  return d === a || d.startsWith(`${a}/`)
}

export function isDefaultFolder(path: string): boolean {
  return (DEFAULT_FOLDERS as readonly string[]).includes(normalizeFolderPath(path))
}

export function folderHasContents(path: string, files: TestFile[]): boolean {
  const normalized = normalizeFolderPath(path)
  return files.some(f => f.path === normalized || f.path.startsWith(`${normalized}/`))
}

function sortNodes(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function ensureFolder(level: TreeNode[], part: string, builtPath: string): TreeNode[] {
  let folder = level.find(n => n.type === 'folder' && n.name === part)
  if (!folder) {
    folder = { name: part, path: builtPath, type: 'folder', children: [] }
    level.push(folder)
    sortNodes(level)
  }
  return folder.children!
}

export function buildFileTree(files: TestFile[], extraFolders: string[] = []): TreeNode[] {
  const root: TreeNode[] = []
  const folderPaths = new Set<string>([...DEFAULT_FOLDERS, ...extraFolders])

  for (const f of files) {
    const parts = f.path.split('/').filter(Boolean)
    parts.pop()
    let built = ''
    for (const p of parts) {
      built = built ? `${built}/${p}` : p
      folderPaths.add(built)
    }
  }

  for (const fp of [...folderPaths].sort()) {
    const segments = fp.split('/').filter(Boolean)
    let level = root
    let built = ''
    for (const part of segments) {
      built = built ? `${built}/${part}` : part
      level = ensureFolder(level, part, built)
    }
  }

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean)
    const fileName = segments.pop() ?? file.name
    let level = root
    let builtPath = ''

    for (const part of segments) {
      builtPath = builtPath ? `${builtPath}/${part}` : part
      level = ensureFolder(level, part, builtPath)
    }

    level.push({
      name: fileName,
      path: file.path,
      type: 'file',
      file: { id: file.id, name: file.name, path: file.path, updatedAt: file.updatedAt },
    })
    sortNodes(level)
  }

  sortNodes(root)
  return root
}
