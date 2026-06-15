import { foldService, codeFolding, foldGutter, foldKeymap } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'

function lineIndent(text: string) {
  return text.length - text.trimStart().length
}

function foldRange(state: EditorState, lineNo: number): { from: number; to: number } | null {
  const line = state.doc.line(lineNo)
  const trimmed = line.text.trim()
  if (!trimmed) return null

  const startIndent = lineIndent(line.text)
  const isTest = /^TEST\s+/.test(trimmed)
  const isSection = trimmed === 'STEPS' || trimmed === 'ASSERT' || trimmed === 'SETUP'
  if (!isTest && !isSection) return null

  let endLine = lineNo
  for (let i = lineNo + 1; i <= state.doc.lines; i++) {
    const next = state.doc.line(i)
    const t = next.text.trim()
    if (!t) {
      endLine = i
      continue
    }

    const ind = lineIndent(next.text)
    if (isTest) {
      if (ind === 0 && /^TEST\s+/.test(t)) break
    } else if (ind <= startIndent && (
      t === 'STEPS' || t === 'ASSERT' || t === 'SETUP' ||
      /^DEPENDS ON\s+/.test(t) ||
      /^TEST\s+/.test(t)
    )) {
      break
    }
    endLine = i
  }

  if (endLine <= lineNo) return null
  return { from: line.to, to: state.doc.line(endLine).to }
}

const axtestFoldService = foldService.of((state, start) => {
  const line = state.doc.lineAt(start)
  const trimmed = line.text.trim()
  if (!/^TEST\s+/.test(trimmed) && trimmed !== 'STEPS' && trimmed !== 'ASSERT' && trimmed !== 'SETUP') {
    return null
  }
  return foldRange(state, line.number)
})

export const axtestFoldExtensions = [
  codeFolding({ placeholderText: '…' }),
  foldGutter({ openText: '▾', closedText: '▸' }),
  axtestFoldService,
  keymap.of(foldKeymap),
]
