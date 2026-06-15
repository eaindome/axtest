import { linter, type Diagnostic } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet } from '@codemirror/view'
import { validateAxtest } from './validate-axtest'

export const axtestLinter = linter(view => validateAxtest(view.state.doc.toString()), { delay: 150 })

const flashDiagnosticEffect = StateEffect.define<{ from: number; to: number }>()

const flashDiagnosticField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decs, tr) {
    decs = decs.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(flashDiagnosticEffect)) {
        return Decoration.set([
          Decoration.mark({ class: 'cm-diagnostic-flash' }).range(e.value.from, e.value.to),
        ])
      }
      if (e.is(clearFlashEffect)) return Decoration.none
    }
    return decs
  },
  provide: f => EditorView.decorations.from(f),
})

const clearFlashEffect = StateEffect.define<null>()

export const diagnosticFlashExtension = flashDiagnosticField

export function countDiagnostics(diagnostics: Diagnostic[]): { errors: number; warnings: number } {
  let errors = 0
  let warnings = 0
  for (const d of diagnostics) {
    if (d.severity === 'error') errors++
    else warnings++
  }
  return { errors, warnings }
}

export function filterDiagnostics(diagnostics: Diagnostic[], severity: 'error' | 'warning') {
  return [...diagnostics]
    .filter(d => d.severity === severity)
    .sort((a, b) => a.from - b.from || a.to - b.to)
}

let flashTimer: ReturnType<typeof setTimeout> | null = null

export function goToDiagnostic(
  view: EditorView,
  diagnostics: Diagnostic[],
  index: number,
  severity: 'error' | 'warning' = 'error',
): number {
  const list = filterDiagnostics(diagnostics, severity)
  if (!list.length) return 0
  const i = ((index % list.length) + list.length) % list.length
  const d = list[i]

  if (flashTimer) clearTimeout(flashTimer)
  view.dispatch({
    selection: { anchor: d.from, head: d.to },
    effects: [
      EditorView.scrollIntoView(d.from, { y: 'center' }),
      flashDiagnosticEffect.of({ from: d.from, to: d.to }),
    ],
  })
  view.focus()

  flashTimer = setTimeout(() => {
    view.dispatch({ effects: clearFlashEffect.of(null) })
    flashTimer = null
  }, 2200)

  return i
}
