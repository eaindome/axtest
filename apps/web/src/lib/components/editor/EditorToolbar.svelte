<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import { darkMode } from '$lib/stores/theme'
  import { ENV_OPTIONS } from '$lib/editor/step-options'
  import { envLabel } from '$lib/editor/resolve-env-url'
  import type { Project, TestFile, EnvironmentName } from '$lib/api'
  let { activeProject, projects, activeFile, dirty, saving, running, mode, environment, effectiveUrl, environmentNeedsSetup = false, validationErrors = 0, validationWarnings = 0, onJumpToError, onJumpToWarning, onSelectProject, onSwitchCode, onSwitchVisual, onSave, onRun, onEnvironmentChange, onEditEnvironment }: {
    activeProject: Project | null; projects: Project[]; activeFile: TestFile | null
    dirty: boolean; saving: boolean; running: boolean; mode: 'code' | 'visual'; environment: EnvironmentName; effectiveUrl: string; environmentNeedsSetup?: boolean
    validationErrors?: number; validationWarnings?: number; onJumpToError?: () => void; onJumpToWarning?: () => void
    onSelectProject: (project: Project) => void; onSwitchCode: () => void; onSwitchVisual: () => void; onSave: () => void; onRun: () => void; onEnvironmentChange: (value: string) => void; onEditEnvironment: () => void
  } = $props()
</script>

<header class="min-h-16 shrink-0 flex flex-wrap items-center gap-3 py-3 pl-14 pr-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
  <div class="min-w-0 flex-1">
    <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{activeProject?.name ?? 'Test editor'}</p>
    <p class="text-xs text-zinc-500 truncate">{activeFile?.name ?? 'Choose a suite from Projects'}</p>
  </div>
  {#if validationErrors}<button type="button" class="text-xs text-red-600 underline" onclick={() => onJumpToError?.()}>{validationErrors} errors</button>{:else if validationWarnings}<button type="button" class="text-xs text-amber-700 underline" onclick={() => onJumpToWarning?.()}>{validationWarnings} warnings</button>{/if}
  <DropdownMenu label="Environment" value={environment} options={ENV_OPTIONS} disabled={running || saving} onchange={onEnvironmentChange} />
  <button type="button" disabled={!activeProject || running} title={effectiveUrl} aria-label={`Edit ${envLabel(environment)} URL`} onclick={onEditEnvironment} class="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">{environmentNeedsSetup ? 'Set URL' : 'Edit URL'}</button>
  <SegmentedControl value={mode} options={[{ value: 'code', label: 'Code' }, { value: 'visual', label: 'Visual' }]} onchange={value => value === 'code' ? onSwitchCode() : onSwitchVisual()} size="sm" ariaLabel="Editor mode" />
  <button type="button" aria-label="Toggle dark mode" class="size-8 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => darkMode.update(value => !value)}>{$darkMode ? '☀' : '☾'}</button>
  <Button variant="secondary" size="sm" onclick={onSave} loading={saving} disabled={!dirty || running}>Save</Button>
  <Button size="sm" onclick={onRun} loading={running} disabled={!activeFile || saving || validationErrors > 0}>Run this suite</Button>
</header>
