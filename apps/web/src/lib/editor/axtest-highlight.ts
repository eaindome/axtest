import { EditorView, ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const KEYWORDS = new Set([
  'TEST', 'STEPS', 'ASSERT', 'AUTH', 'MODULE', 'DEPENDS', 'ON', 'TAG', 'ID', 'GENERATED', 'FROM', 'RULES',
])

const ACTIONS = new Set([
  'navigate', 'click', 'type', 'select', 'clear', 'assert',
  'check', 'wait', 'press', 'upload', 'confirm', 'dismiss',
])

const ASSERTIONS = new Set([
  'is_visible', 'is_not_visible', 'is_enabled', 'is_disabled',
  'contains', 'equals', 'does_not_equal', 'shows',
])

type Style = 'keyword' | 'action' | 'string' | 'comment' | 'meta' | 'assertion' | 'separator'

const STYLE_CLASSES: Record<Style, string> = {
  keyword:   'cm-ax-keyword',
  action:    'cm-ax-action',
  string:    'cm-ax-string',
  comment:   'cm-ax-comment',
  meta:      'cm-ax-meta',
  assertion: 'cm-ax-assertion',
  separator: 'cm-ax-separator',
}

function buildDecorations(view: EditorView): DecorationSet {
  const decs: ReturnType<Decoration['range']>[] = []
  const doc = view.state.doc

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text

    if (text.trim() === '---') {
      decs.push(Decoration.mark({ class: STYLE_CLASSES.separator }).range(line.from, line.to))
      continue
    }

    if (text.trim().startsWith('#')) {
      decs.push(Decoration.mark({ class: STYLE_CLASSES.comment }).range(line.from, line.to))
      continue
    }

    const metaMatch = text.match(/^(title|base_url|rules):\s*(.*)$/)
    if (metaMatch) {
      const keyEnd = line.from + metaMatch[1].length
      decs.push(Decoration.mark({ class: STYLE_CLASSES.meta }).range(line.from, keyEnd))
      if (metaMatch[2]) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.string }).range(keyEnd + 2, line.to))
      }
      continue
    }

    if (/^\s*-\s+/.test(text)) {
      decs.push(Decoration.mark({ class: STYLE_CLASSES.string }).range(line.from, line.to))
      continue
    }

    const tokens = [...text.matchAll(/\b([A-Z][A-Z_ ]*[A-Z]|[a-z_]+)\b|"[^"]*"|'[^']*'/g)]
    for (const m of tokens) {
      const start = line.from + m.index!
      const end = start + m[0].length
      const tok = m[1] ?? m[0]

      if (m[0].startsWith('"') || m[0].startsWith("'")) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.string }).range(start, end))
      } else if (KEYWORDS.has(tok) || (tok === 'DEPENDS' && text.includes('DEPENDS ON'))) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.keyword }).range(start, end))
      } else if (ACTIONS.has(tok)) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.action }).range(start, end))
      } else if (ASSERTIONS.has(tok) || tok.includes('_')) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.assertion }).range(start, end))
      }
    }
  }

  return Decoration.set(decs, true)
}

const axtestHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildDecorations(view) }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: v => v.decorations }
)

export function axtestHighlighting(dark: boolean) {
  const theme = EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', fontSize: '15px', lineHeight: '1.6' },
    '.cm-content': { padding: '16px 0', caretColor: dark ? '#fbbf24' : '#d97706', color: dark ? '#e4e4e7' : '#18181b' },
    '.cm-line': { color: dark ? '#e4e4e7' : '#18181b' },
    '.cm-gutters': {
      backgroundColor: dark ? '#18181b' : '#fafafa',
      color: dark ? '#52525b' : '#d4d4d8',
      borderRight: `1px solid ${dark ? '#27272a' : '#f4f4f5'}`,
    },
    '.cm-activeLineGutter': { backgroundColor: dark ? '#27272a' : '#f4f4f5' },
    '.cm-activeLine': { backgroundColor: dark ? 'rgba(39,39,42,0.5)' : 'rgba(250,250,250,0.8)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: dark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.2)',
    },
    '.cm-ax-keyword':   { color: dark ? '#c084fc' : '#7c3aed', fontWeight: '600' },
    '.cm-ax-action':    { color: dark ? '#38bdf8' : '#0284c7' },
    '.cm-ax-string':    { color: dark ? '#86efac' : '#16a34a' },
    '.cm-ax-comment':   { color: dark ? '#71717a' : '#a1a1aa', fontStyle: 'italic' },
    '.cm-ax-meta':      { color: dark ? '#fbbf24' : '#d97706' },
    '.cm-ax-assertion': { color: dark ? '#fb923c' : '#ea580c' },
    '.cm-ax-separator': { color: dark ? '#52525b' : '#d4d4d8' },
    '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy #f87171', textDecorationThickness: '2px', textUnderlineOffset: '3px' },
    '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy #fbbf24', textDecorationThickness: '2px', textUnderlineOffset: '3px' },
    '.cm-diagnostic-flash': { backgroundColor: dark ? 'rgba(248,113,113,0.18)' : 'rgba(239,68,68,0.12)', borderRadius: '2px' },
    '.cm-gutter-lint': { width: '1.1em', cursor: 'pointer' },
    '.cm-lint-marker-error': { content: '"●"', color: '#ef4444' },
    '.cm-lint-marker-warning': { content: '"●"', color: '#f59e0b' },
    '.cm-tooltip.cm-tooltip-autocomplete': { backgroundColor: dark ? '#27272a' : '#fff', border: `1px solid ${dark ? '#3f3f46' : '#e4e4e7'}`, color: dark ? '#e4e4e7' : '#18181b' },
    '.cm-tooltip-autocomplete > ul': { fontFamily: 'ui-monospace, monospace', fontSize: '14px' },
    '.cm-tooltip-autocomplete > ul > li': { color: dark ? '#d4d4d8' : '#3f3f46' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: dark ? '#3f3f46' : '#fef3c7', color: dark ? '#fbbf24' : '#92400e' },
    '.cm-completionLabel': { fontWeight: '500' },
    '.cm-completionDetail': { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '13px', color: dark ? '#71717a' : '#a1a1aa', marginLeft: '0.75rem' },
    '.cm-completionInfo, .cm-tooltip.cm-completionInfo': { display: 'none !important' },
    '.cm-foldGutter': { width: '0.9em' },
    '.cm-foldGutter span': { cursor: 'pointer', color: dark ? '#71717a' : '#a1a1aa', fontSize: '13px' },
    '.cm-foldPlaceholder': { color: dark ? '#71717a' : '#a1a1aa', border: 'none', background: 'transparent' },
  }, { dark })

  return [axtestHighlightPlugin, theme]
}

export const axtestHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#7c3aed', fontWeight: '600' },
  { tag: t.string, color: '#16a34a' },
  { tag: t.comment, color: '#a1a1aa', fontStyle: 'italic' },
])
