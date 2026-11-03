<script lang="ts">
  import RunSettings from './RunSettings.svelte'
  import { suiteLabel } from '$lib/suites'
  import type { RunPreferences } from '$lib/run-preferences'
  import Button from '$lib/components/ui/Button.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import { darkMode } from '$lib/stores/theme'
  import type { Project, TestFile } from '$lib/api'
  let { activeProject, activeFile, dirty, saving, running, mode, validationErrors = 0, validationWarnings = 0, onJumpToError, onJumpToWarning, onSwitchCode, onSwitchVisual, onSave, onRun, runSettings, onRunSettings }: {
    runSettings: RunPreferences; onRunSettings: (value: RunPreferences) => void
    activeProject: Project | null; activeFile: TestFile | null
    dirty: boolean; saving: boolean; running: boolean; mode: 'code' | 'visual'
    validationErrors?: number; validationWarnings?: number; onJumpToError?: () => void; onJumpToWarning?: () => void
    onSwitchCode: () => void; onSwitchVisual: () => void; onSave: () => void; onRun: () => void
  } = $props()
</script>

<header class="min-h-16 shrink-0 flex flex-wrap items-center gap-3 py-3 pl-14 pr-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
  <div class="min-w-0 flex-1 basis-40">
    <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{activeProject?.name ?? 'Test editor'}</p>
    <p class="text-xs text-zinc-500 truncate" title={activeFile?.path}>{activeFile ? suiteLabel(activeFile) : 'Choose a suite from Projects'}</p>
  </div>
  {#if validationErrors}<button type="button" class="text-xs text-red-600 underline" onclick={() => onJumpToError?.()}>{validationErrors} errors</button>{:else if validationWarnings}<button type="button" class="text-xs text-amber-700 underline" onclick={() => onJumpToWarning?.()}>{validationWarnings} warnings</button>{/if}
  <SegmentedControl value={mode} options={[{ value: 'code', label: 'Code' }, { value: 'visual', label: 'Visual' }]} onchange={value => value === 'code' ? onSwitchCode() : onSwitchVisual()} size="sm" ariaLabel="Editor mode" />
  <button type="button" aria-label="Toggle dark mode" class="size-8 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => darkMode.update(value => !value)}>{$darkMode ? '☀' : '☾'}</button>
  <Button variant="secondary" size="sm" onclick={onSave} loading={saving} disabled={!dirty || running}>Save</Button>
  <RunSettings value={runSettings} disabled={running || saving} onchange={onRunSettings} />
  <Button size="sm" onclick={onRun} loading={running} disabled={!activeFile || saving || validationErrors > 0}>Run this suite</Button>
</header>
