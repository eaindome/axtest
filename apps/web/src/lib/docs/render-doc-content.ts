export type DocBlockKind = 'p' | 'pre' | 'table' | 'h2' | 'h3' | 'callout' | 'ul' | 'ol'

export interface DocContentBlock {
  kind: DocBlockKind
  html: string
}

export function renderDocInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
}

function parseList(lines: string[], ordered: boolean): DocContentBlock {
  const items = lines.map(l =>
    ordered ? l.replace(/^\d+\.\s+/, '') : l.replace(/^[-*]\s+/, ''),
  )
  const tag = ordered ? 'ol' : 'ul'
  const inner = items.map(i => `<li>${renderDocInline(i)}</li>`).join('')
  return { kind: ordered ? 'ol' : 'ul', html: `<${tag} class="doc-list">${inner}</${tag}>` }
}

export function parseDocContent(markdown: string): DocContentBlock[] {
  const parts: DocContentBlock[] = []
  const chunks = markdown.split(/\n\n+/)
  for (const chunk of chunks) {
    const t = chunk.trim()
    if (!t) continue

    if (t.startsWith('```')) {
      const code = t.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
      parts.push({ kind: 'pre', html: code })
      continue
    }

    if (t.startsWith('## ')) {
      parts.push({ kind: 'h2', html: renderDocInline(t.slice(3)) })
      continue
    }

    if (t.startsWith('### ')) {
      parts.push({ kind: 'h3', html: renderDocInline(t.slice(4)) })
      continue
    }

    if (t.startsWith('> ')) {
      const body = t.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ')
      parts.push({ kind: 'callout', html: renderDocInline(body) })
      continue
    }

    if (t.startsWith('|')) {
      parts.push({ kind: 'table', html: t })
      continue
    }

    const lines = t.split('\n')
    if (lines.every(l => /^[-*]\s+/.test(l.trim()) || l.trim() === '')) {
      parts.push(parseList(lines.filter(l => l.trim()), false))
      continue
    }

    if (lines.every(l => /^\d+\.\s+/.test(l.trim()) || l.trim() === '')) {
      parts.push(parseList(lines.filter(l => l.trim()), true))
      continue
    }

    if (lines.every(l => /^-\s+\[[ x]\]/.test(l.trim()))) {
      const inner = lines.map(l => {
        const checked = l.includes('[x]')
        const label = l.replace(/^-\s+\[[ x]\]\s*/, '')
        return `<li class="doc-check ${checked ? 'doc-check-done' : ''}">${renderDocInline(label)}</li>`
      }).join('')
      parts.push({ kind: 'ul', html: `<ul class="doc-checklist">${inner}</ul>` })
      continue
    }

    parts.push({ kind: 'p', html: renderDocInline(t.replace(/\n/g, '<br/>')) })
  }
  return parts
}

export function renderDocTable(md: string): string {
  const rows = md.split('\n').filter(r => r.trim().startsWith('|'))
  if (rows.length < 2) return md
  const parseRow = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())
  const header = parseRow(rows[0])
  const body = rows.slice(2).map(parseRow)
  let html = '<table class="doc-table"><thead><tr>'
  for (const h of header) html += `<th>${renderDocInline(h)}</th>`
  html += '</tr></thead><tbody>'
  for (const row of body) {
    html += '<tr>'
    for (const cell of row) html += `<td>${renderDocInline(cell)}</td>`
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

/** Short intro shown at the top of the lesson coach while practicing. */
export const LESSON_COACH_INTRO =
  'Your sandbox is open with this lesson\'s file loaded. Work through the steps below in order — skip anything about opening the Test Editor or picking a project.'
