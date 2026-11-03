<script lang="ts">
  import { suiteLabel } from '$lib/suites'
  import Button from '$lib/components/ui/Button.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import { darkMode } from '$lib/stores/theme'
  import type { Project, TestFile } from '$lib/api'
  let { activeProject, activeFile, suiteTitle, dirty, saving, running, mode, validationErrors = 0, validationWarnings = 0, onJumpToError, onJumpToWarning, onSwitchCode, onSwitchVisual, onSave, onRun }: {
    suiteTitle?: string
    activeProject: Project | null; activeFile: TestFile | null
    dirty: boolean; saving: boolean; running: boolean; mode: 'code' | 'visual'
    validationErrors?: number; validationWarnings?: number; onJumpToError?: () => void; onJumpToWarning?: () => void
    onSwitchCode: () => void; onSwitchVisual: () => void; onSave: () => void; onRun: () => void
  } = $props()
</script>

<header class="min-h-16 shrink-0 flex flex-wrap items-center gap-3 py-3 pl-14 pr-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
  <div class="min-w-0 flex-1 basis-40">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">{#if activeProject}<a class="text-xs font-medium text-amber-700 dark:text-amber-400" href={`/projects/${activeProject.id}/suites`}>Back to suites</a>{/if}<p class="text-xs text-zinc-500 truncate">{activeProject?.name ?? 'Test editor'}</p></div>
    <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p class="min-w-0 text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate" title={activeFile?.path}>{suiteTitle || (activeFile ? suiteLabel(activeFile) : 'Choose a suite from Projects')}</p>
      <p class="text-xs text-zinc-500" role="status">{saving ? 'Saving…' : dirty ? 'Unsaved changes · saved before running' : 'All changes saved'}</p>
    </div>
  </div>
  {#if validationErrors}<button type="button" class="text-xs text-red-600 underline" onclick={() => onJumpToError?.()}>{validationErrors} errors</button>{:else if validationWarnings}<button type="button" class="text-xs text-amber-700 underline" onclick={() => onJumpToWarning?.()}>{validationWarnings} warnings</button>{/if}
  <SegmentedControl value={mode} options={[{ value: 'code', label: 'Code' }, { value: 'visual', label: 'Visual' }]} onchange={value => value === 'code' ? onSwitchCode() : onSwitchVisual()} size="sm" ariaLabel="Editor mode" />
  <button type="button" aria-label="Toggle dark mode" class="size-8 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => darkMode.update(value => !value)}>{$darkMode ? '☀' : '☾'}</button>
  <Button variant="secondary" size="sm" onclick={onSave} loading={saving} disabled={!dirty || running}>Save</Button>
  <Button size="sm" onclick={onRun} loading={running} disabled={!activeFile || saving || validationErrors > 0}>Run this suite</Button>
</header>
