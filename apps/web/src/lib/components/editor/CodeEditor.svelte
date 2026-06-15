<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView } from '@codemirror/view'
  import type { Diagnostic } from '@codemirror/lint'
  import { createEditorState, reconfigureTheme } from '$lib/editor/codemirror-setup'
  import { goToDiagnostic } from '$lib/editor/axtest-lint'
  import { darkMode } from '$lib/stores/theme'

  interface Props {
    value: string
    onchange?: (value: string) => void
    onsave?: () => void
  }

  let { value, onchange, onsave }: Props = $props()

  let container = $state<HTMLDivElement | undefined>(undefined)
  let view: EditorView | null = null
  let lastExternal = $state('')

  export function focusDiagnostic(
    diagnostics: Diagnostic[],
    index: number,
    severity: 'error' | 'warning' = 'error',
  ): number {
    if (!view) return 0
    return goToDiagnostic(view, diagnostics, index, severity)
  }

  onMount(() => {
    if (!container) return
    lastExternal = value

    view = new EditorView({
      state: createEditorState(value, $darkMode, v => {
        lastExternal = v
        onchange?.(v)
      }),
      parent: container,
    })

    const saveHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        onsave?.()
      }
    }
    window.addEventListener('keydown', saveHandler)

    const unsub = darkMode.subscribe(d => {
      if (view) reconfigureTheme(view, d)
    })

    return () => {
      window.removeEventListener('keydown', saveHandler)
      unsub()
    }
  })

  $effect(() => {
    if (!view || value === lastExternal) return
    lastExternal = value
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
  })

  onDestroy(() => {
    view?.destroy()
    view = null
  })
</script>

<div bind:this={container} class="h-full w-full overflow-hidden text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"></div>

<style>
  :global(.cm-editor) {
    font-size: 0.9375rem;
    line-height: 1.6;
  }
</style>
