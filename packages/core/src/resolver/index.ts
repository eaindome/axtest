import * as path from 'path'
import * as fs from 'fs'
import { parseFile } from '../parser/index.js'
import type { FileContext } from '../types/index.js'

/**
 * Loads all AUTH files from the auth/ directory.
 * Returns a map of auth-name → FileContext.
 */
export function loadAuthContexts(projectRoot: string): Map<string, FileContext> {
  return loadContextDir(path.join(projectRoot, 'auth'))
}

/**
 * Loads all MODULE files from the modules/ directory.
 * Returns a map of module-name → FileContext.
 */
export function loadModuleContexts(projectRoot: string): Map<string, FileContext> {
  return loadContextDir(path.join(projectRoot, 'modules'))
}

function loadContextDir(dir: string): Map<string, FileContext> {
  const map = new Map<string, FileContext>()
  if (!fs.existsSync(dir)) return map

  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.axtest'))
  for (const file of files) {
    const filePath = path.join(dir, file)
    const ctx = parseFile(filePath)

    // The context name is derived from the AUTH or MODULE declaration in the file,
    // or falls back to the filename without extension.
    const name = ctx.auth ?? ctx.module ?? path.basename(file, '.axtest')
    map.set(name, ctx)
  }

  return map
}

/**
 * Loads the axtest.config file from the project root.
 */
export function loadConfig(projectRoot: string): Record<string, string> {
  const configPath = path.join(projectRoot, 'axtest.config')
  if (!fs.existsSync(configPath)) return {}

  const config: Record<string, string> = {}
  const lines = fs.readFileSync(configPath, 'utf-8').split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const spaceIdx = trimmed.search(/\s/)
    if (spaceIdx === -1) continue
    const key = trimmed.slice(0, spaceIdx).trim()
    const value = trimmed.slice(spaceIdx).trim()
    config[key] = value
  }

  return config
}

/**
 * Finds all .axtest test files under a given path.
 * If path is a file, returns just that file.
 * If path is a directory, returns all .axtest files recursively.
 */
export function resolveTestFiles(targetPath: string): string[] {
  const stat = fs.statSync(targetPath)
  if (stat.isFile()) return [path.resolve(targetPath)]

  const files: string[] = []
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.axtest')) {
        files.push(full)
      }
    }
  }
  walk(path.resolve(targetPath))
  return files
}
