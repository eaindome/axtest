<script lang="ts">
  import { suiteLabel } from '$lib/suites'
  import Button from '$lib/components/ui/Button.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import type { Project, TestFile } from '$lib/api'
  let { activeProject, activeFile, suiteTitle, dirty, saving, running, mode, setupOpen, onSetup, onSettings, settingsDisabled = false, validationErrors = 0, validationWarnings = 0, onJumpToError, onJumpToWarning, onSwitchCode, onSwitchVisual, onSave, onRun }: {
    setupOpen: boolean; onSetup: () => void; onSettings: () => void; settingsDisabled?: boolean
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
      <button type="button" aria-label="Suite settings" disabled={!activeFile || settingsDisabled} title={settingsDisabled ? 'Edit this advanced suite in Code' : 'Suite settings'} onclick={onSettings} class="text-xs text-zinc-500 disabled:opacity-40">Settings</button>
      <p class="text-xs text-zinc-500" role="status">{saving ? 'Saving…' : dirty ? 'Unsaved changes · saved before running' : 'All changes saved'}</p>
      {#if validationErrors}<button type="button" class="text-xs text-red-600 underline" onclick={() => onJumpToError?.()}>{validationErrors} errors</button>{:else if validationWarnings}<button type="button" class="text-xs text-amber-700 underline" onclick={() => onJumpToWarning?.()}>{validationWarnings} warnings</button>{/if}
    </div>
  </div>

  <div class="shrink-0" aria-label="Editor view">
    <SegmentedControl value={mode} options={[{ value: 'code', label: 'Code' }, { value: 'visual', label: 'Visual' }]} onchange={value => value === 'code' ? onSwitchCode() : onSwitchVisual()} size="sm" class="h-9 [&_button]:py-0" ariaLabel="Editor mode" />
  </div>
  <div class="flex flex-wrap items-center gap-3" role="group" aria-label="Editor actions">
    <button type="button" aria-label="Run setup" aria-expanded={setupOpen} disabled={!activeProject} onclick={onSetup} class="h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 px-3.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400/50">Run setup</button>
    <div class="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-700 pl-3">
      <Button variant="secondary" size="sm" onclick={onSave} loading={saving} disabled={!dirty || running}>Save</Button>
      <Button size="sm" onclick={onRun} loading={running} disabled={!activeFile || saving || validationErrors > 0}>Run this suite</Button>
    </div>
  </div>
</header>
