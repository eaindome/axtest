import { indentService, indentUnit, type IndentContext } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import type { Text } from '@codemirror/state'

const UNIT = 2
const sp = (n: number) => ' '.repeat(n)

export type Section = 'steps' | 'asserts' | 'setup' | null

export interface AxContext {
  inTest: boolean
  section: Section
}

const TEST_RE = /^TEST\s+/
const TOP_RE = /^(AUTH|MODULE)\s/
const DEPENDS_RE = /^DEPENDS ON\s+/
const SECTIONS = new Set(['STEPS', 'ASSERT', 'SETUP'])

export function updateContext(ctx: AxContext, trimmed: string): AxContext {
  if (!trimmed || trimmed.startsWith('#')) return ctx

  if (TEST_RE.test(trimmed)) return { inTest: true, section: null }
  if (TOP_RE.test(trimmed)) return { inTest: false, section: null }

  if (ctx.inTest) {
    if (DEPENDS_RE.test(trimmed)) return ctx
    if (trimmed === 'STEPS') return { ...ctx, section: 'steps' }
    if (trimmed === 'ASSERT') return { ...ctx, section: 'asserts' }
    if (trimmed === 'SETUP') return { ...ctx, section: 'setup' }
    return ctx
  }

  if (trimmed === 'STEPS') return { ...ctx, section: 'steps' }
  if (trimmed === 'ASSERT') return { ...ctx, section: 'asserts' }
  if (trimmed === 'SETUP') return { ...ctx, section: 'setup' }
  return ctx
}

export function ctxAtLine(doc: Text, lineNo: number): AxContext {
  let ctx: AxContext = { inTest: false, section: null }
  const end = Math.max(1, Math.min(lineNo, doc.lines))
  for (let i = 1; i <= end; i++) {
    const t = doc.line(i).text.trim()
    if (t) ctx = updateContext(ctx, t)
  }
  return ctx
}

/** Column indent for an existing line's content. */
export function indentColumn(doc: Text, lineNo: number): number {
  const line = doc.line(lineNo)
  const trimmed = line.text.trim()
  if (!trimmed) {
    const ctx = ctxAtLine(doc, lineNo - 1)
    if (ctx.section) return ctx.inTest ? 4 : 2
    if (ctx.inTest) return 2
    return 0
  }

  if (trimmed === '---' || trimmed.startsWith('title:') || trimmed.startsWith('base_url:')) return 0
  if (trimmed === 'RULES' || trimmed.startsWith('field ') || trimmed.startsWith('on ') || trimmed.startsWith('url ') || trimmed.startsWith('element ') || trimmed.startsWith('note ')) return 0
  if (TEST_RE.test(trimmed) || TOP_RE.test(trimmed)) return 0

  const ctx = ctxAtLine(doc, lineNo - 1)

  if (DEPENDS_RE.test(trimmed)) return ctx.inTest ? 2 : 0
  if (SECTIONS.has(trimmed)) return ctx.inTest ? 2 : 0
  if (ctx.section) return ctx.inTest ? 4 : 2
  if (ctx.inTest) return 2
  return 0
}

/** Column indent for a new line created after `lineNo`. */
export function indentAfterLine(doc: Text, lineNo: number): number {
  const trimmed = doc.line(lineNo).text.trim()
  const ctx = ctxAtLine(doc, lineNo)

  if (!trimmed) {
    if (ctx.section) return ctx.inTest ? 4 : 2
    if (ctx.inTest) return 2
    return 0
  }

  if (TEST_RE.test(trimmed) || DEPENDS_RE.test(trimmed)) return 2
  if (SECTIONS.has(trimmed)) return ctx.inTest ? 4 : 2
  if (ctx.section) return ctx.inTest ? 4 : 2
  if (ctx.inTest) return 2
  return 0
}

function axtestIndent(context: IndentContext, pos: number): number | null {
  const { state, simulatedBreak } = context
  if (simulatedBreak != null) {
    return indentAfterLine(state.doc, state.doc.lineAt(simulatedBreak).number)
  }
  return indentColumn(state.doc, state.doc.lineAt(pos).number)
}

export function reindentAxtest(view: EditorView): boolean {
  const { state } = view
  const ranges = state.selection.ranges
  const lines = new Set<number>()
  for (const r of ranges) {
    const from = state.doc.lineAt(r.from).number
    const to = state.doc.lineAt(r.to).number
    for (let n = from; n <= to; n++) lines.add(n)
  }

  const changes: { from: number; to: number; insert: string }[] = []
  for (const n of [...lines].sort((a, b) => a - b)) {
    const line = state.doc.line(n)
    const trimmed = line.text.trim()
    if (!trimmed) continue
    const desired = indentColumn(state.doc, n)
    const current = line.text.length - trimmed.length
    if (current === desired) continue
    changes.push({ from: line.from, to: line.from + current, insert: sp(desired) })
  }

  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export function outdentAxtest(view: EditorView): boolean {
  const { state } = view
  const changes: { from: number; to: number; insert: string }[] = []

  for (const r of state.selection.ranges) {
    const from = state.doc.lineAt(r.from).number
    const to = state.doc.lineAt(r.to).number
    for (let n = from; n <= to; n++) {
      const line = state.doc.line(n)
      const lead = line.text.match(/^ */)?.[0].length ?? 0
      if (!lead) continue
      const remove = Math.min(UNIT, lead)
      changes.push({ from: line.from, to: line.from + remove, insert: '' })
    }
  }

  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export const axtestIndentExtensions = [
  indentUnit.of(sp(UNIT)),
  indentService.of(axtestIndent),
]

export const TEST_BLOCK_SNIPPET = `TEST ""
  STEPS
    
  ASSERT
    `

export function isInsideTest(doc: Text, lineNo: number): boolean {
  return ctxAtLine(doc, lineNo).inTest
}

export function lineContentIndent(doc: Text, lineNo: number): string {
  const col = indentColumn(doc, lineNo)
  return sp(col)
}

/** Re-indent every structural line in the document. */
export function formatAxtestIndent(view: EditorView): boolean {
  const { doc } = view.state
  const changes: { from: number; to: number; insert: string }[] = []
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n)
    const trimmed = line.text.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const desired = indentColumn(doc, n)
    const current = line.text.length - trimmed.length
    if (current !== desired) {
      changes.push({ from: line.from, to: line.from + current, insert: sp(desired) })
    }
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}
