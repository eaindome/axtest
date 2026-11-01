import type { TestFile } from '$lib/api/types'

export function runInputNames(content: string, files: TestFile[]): string[] {
  const visited = new Set<string>(), sources: string[] = []
  function visit(source: string) {
    if (visited.has(source)) return
    visited.add(source); sources.push(source)
    for (const match of source.matchAll(/^\s*(AUTH|MODULE)\s+"?([^"\r\n]+)"?\s*$/gm)) {
      const kind = match[1] === 'AUTH' ? 'auth' : 'modules', name = match[2].trim()
      for (const file of files.filter(f => f.path.startsWith(kind + '/'))) {
        const aliases = [file.path.split('/').pop()?.replace(/\.axtest$/, ''), file.path.slice(kind.length + 1).replace(/\.axtest$/, ''), file.content.match(/^\s*(?:AUTH|MODULE)\s+"?([^"\r\n]+)"?/m)?.[1].trim()]
        if (aliases.includes(name)) visit(file.content)
      }
    }
  }
  visit(content)
  return [...new Set(sources.flatMap(source => [...source.matchAll(/\{\{(AXTEST_[A-Z0-9_]+)\}\}/g)].map(m => m[1])))].sort()
}
