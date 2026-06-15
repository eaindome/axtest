import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, insertNewlineAndIndent } from '@codemirror/commands'
import { lintGutter, lintKeymap } from '@codemirror/lint'
import { axtestHighlighting } from './axtest-highlight'
import { axtestLinter, diagnosticFlashExtension } from './axtest-lint'
import { axtestAutocomplete } from './axtest-autocomplete'
import { axtestIndentExtensions, reindentAxtest, outdentAxtest } from './axtest-indent'
import { axtestFoldExtensions } from './axtest-fold'

export const themeCompartment = new Compartment()

const axtestKeymap = keymap.of([
  { key: 'Tab', run: reindentAxtest },
  { key: 'Shift-Tab', run: outdentAxtest },
  { key: 'Enter', run: insertNewlineAndIndent },
])

export function baseExtensions(dark: boolean): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    rectangularSelection(),
    lintGutter(),
    axtestLinter,
    diagnosticFlashExtension,
    axtestAutocomplete,
    ...axtestIndentExtensions,
    ...axtestFoldExtensions,
    EditorState.allowMultipleSelections.of(true),
    axtestKeymap,
    keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap]),
    themeCompartment.of(axtestHighlighting(dark)),
    EditorView.lineWrapping,
  ]
}

export function createEditorState(content: string, dark: boolean, onChange: (value: string) => void): EditorState {
  return EditorState.create({
    doc: content,
    extensions: [
      ...baseExtensions(dark),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChange(update.state.doc.toString())
      }),
    ],
  })
}

export function reconfigureTheme(view: EditorView, dark: boolean) {
  view.dispatch({ effects: themeCompartment.reconfigure(axtestHighlighting(dark)) })
}
