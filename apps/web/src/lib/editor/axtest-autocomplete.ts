import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import type { EditorView } from '@codemirror/view'
import { ctxAtLine, TEST_BLOCK_SNIPPET } from './axtest-indent'

function cq(s: string) { const i = s.indexOf('""'); return i === -1 ? s.length : i + 1 }

function apply(snippet: string, cursor?: number) {
  const pos = cursor ?? cq(snippet)
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    view.dispatch({ changes: { from, to, insert: snippet }, selection: { anchor: from + pos } })
  }
}

function applyTestBlock(view: EditorView, _c: Completion, from: number, to: number) {
  view.dispatch({
    changes: { from, to, insert: TEST_BLOCK_SNIPPET },
    selection: { anchor: from + cq('TEST ""') },
  })
}

type S = { label: string; snippet: string; cursor?: number; type?: Completion['type'] }
function c(d: S): Completion {
  return { label: d.label, detail: d.snippet, type: d.type ?? 'keyword', apply: apply(d.snippet, d.cursor) }
}

const ACTIONS: Completion[] = [
  c({ label: 'navigate to', snippet: 'navigate to ""' }),
  c({ label: 'click', snippet: 'click ""' }),
  c({ label: 'click tab', snippet: 'click tab ""' }),
  c({ label: 'click … in sidebar', snippet: 'click "" in sidebar' }),
  c({ label: 'click … in action bar', snippet: 'click "" in action bar' }),
  c({ label: 'click … in modal', snippet: 'click "" in modal' }),
  c({ label: 'click … in row', snippet: 'click "" in row ""' }),
  c({ label: 'type', snippet: 'type "" in ""' }),
  c({ label: 'select', snippet: 'select "" in ""' }),
  c({ label: 'select first from', snippet: 'select first from ""' }),
  c({ label: 'clear', snippet: 'clear ""' }),
  c({ label: 'check', snippet: 'check ""' }),
  c({ label: 'uncheck', snippet: 'uncheck ""' }),
  c({ label: 'wait for … to appear', snippet: 'wait for "" to appear' }),
  c({ label: 'wait for page to load', snippet: 'wait for page to load', cursor: 24 }),
  c({ label: 'press', snippet: 'press ""' }),
  c({ label: 'assert', snippet: 'assert "" is_visible' }),
  c({ label: 'confirm dialog', snippet: 'confirm dialog', cursor: 15 }),
  c({ label: 'dismiss dialog', snippet: 'dismiss dialog', cursor: 14 }),
]

const BLOCKS: Completion[] = [
  { label: 'TEST', detail: 'TEST "" · STEPS · ASSERT', type: 'text', apply: applyTestBlock },
  c({ label: 'STEPS', snippet: 'STEPS', type: 'text', cursor: 5 }),
  c({ label: 'ASSERT', snippet: 'ASSERT', type: 'text', cursor: 6 }),
  c({ label: 'AUTH', snippet: 'AUTH standard-login', type: 'text', cursor: 5 }),
  c({ label: 'DEPENDS ON', snippet: 'DEPENDS ON ""', type: 'text' }),
]

const ASSERTIONS: Completion[] = [
  c({ label: 'is_visible', snippet: '"" is_visible', type: 'variable' }),
  c({ label: 'is_not_visible', snippet: '"" is_not_visible', type: 'variable' }),
  c({ label: 'is_enabled', snippet: '"" is_enabled', type: 'variable' }),
  c({ label: 'contains', snippet: '"" contains ""', type: 'variable' }),
  c({ label: 'toast shows', snippet: 'toast shows ""', type: 'variable' }),
  c({ label: 'url contains', snippet: 'url contains ""', type: 'variable' }),
  c({ label: 'modal is open', snippet: 'modal is open', type: 'variable', cursor: 13 }),
]

function sectionAt(doc: { line: (n: number) => { text: string } }, lineNo: number): 'steps' | 'asserts' | null {
  const s = ctxAtLine(doc as import('@codemirror/state').Text, lineNo).section
  return s === 'steps' || s === 'asserts' ? s : null
}

function matchPrefix<T extends { label: string }>(items: T[], partial: string) {
  const p = partial.toLowerCase()
  return items.filter(o => o.label.toLowerCase().startsWith(p) || p === '')
}

function axtestCompletions(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  const trimmed = before.trimStart()
  const indent = before.length - trimmed.length
  const from = line.from + indent

  if (!context.explicit && !context.matchBefore(/\w[\w ]*/)) return null

  const word = context.matchBefore(/[\w ]*/)
  const partial = trimmed.toLowerCase()
  const inAssert = sectionAt(context.state.doc, line.number) === 'asserts'

  if (trimmed.startsWith('assert ')) {
    const opts = matchPrefix(ASSERTIONS, trimmed.slice(7).trim())
    if (opts.length) return { from: line.from + indent + 7, options: opts, validFor: /^[\w ]*$/ }
  }

  if (inAssert && !trimmed.startsWith('assert')) {
    const opts = matchPrefix(ASSERTIONS, trimmed)
    if (opts.length) return { from, options: opts, validFor: /^[\w "]*$/ }
  }

  if (trimmed === '' || /^[A-Z]/.test(trimmed)) {
    const opts = matchPrefix([...BLOCKS, ...ACTIONS], trimmed)
    if (opts.length) return { from, options: opts, validFor: /^[\w …]*$/ }
  }

  if (/^[a-z]/.test(trimmed)) {
    const opts = matchPrefix(ACTIONS, partial)
    if (opts.length) return { from: word ? from : context.pos, options: opts, validFor: /^[\w …]*$/ }
  }

  return null
}

export const axtestAutocomplete = autocompletion({
  override: [axtestCompletions],
  activateOnTyping: true,
  maxRenderedOptions: 14,
  defaultKeymap: true,
  closeOnBlur: false,
})
