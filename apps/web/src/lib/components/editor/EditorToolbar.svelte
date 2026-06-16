<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import Dropdown, { type DropdownOption } from '$lib/components/ui/Dropdown.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import { darkMode } from '$lib/stores/theme'
  import { ENV_OPTIONS } from '$lib/editor/step-options'
  import { isOverridableEnv, envLabel } from '$lib/editor/resolve-env-url'
  import type { Project, TestFile, EnvironmentName } from '$lib/api'

  interface Props {
    activeProject: Project | null
    projects: Project[]
    activeFile: TestFile | null
    dirty: boolean
    saving: boolean
    running: boolean
    mode: 'code' | 'visual'
    environment: EnvironmentName
    effectiveUrl: string
    environmentNeedsSetup?: boolean
    validationErrors?: number
    validationWarnings?: number
    onJumpToError?: () => void
    onJumpToWarning?: () => void
    onSelectProject: (p: Project) => void
    onSwitchCode: () => void
    onSwitchVisual: () => void
    onSave: () => void
    onRun: () => void
    onEnvironmentChange: (env: string) => void
    onEditEnvironment: () => void
  }

  let {
    activeProject,
    projects,
    activeFile,
    dirty,
    saving,
    running,
    mode,
    environment,
    effectiveUrl,
    environmentNeedsSetup = false,
    validationErrors = 0,
    validationWarnings = 0,
    onJumpToError,
    onJumpToWarning,
    onSelectProject,
    onSwitchCode,
    onSwitchVisual,
    onSave,
    onRun,
    onEnvironmentChange,
    onEditEnvironment,
  }: Props = $props()

  const projectOptions: DropdownOption[] = $derived(
    projects.map(p => ({ value: String(p.id), label: p.name }))
  )

  const canEditEnv = $derived(isOverridableEnv(environment))
</script>

{#snippet divider()}
  <div class="w-px h-5 bg-zinc-200 dark:bg-zinc-700 shrink-0" aria-hidden="true"></div>
{/snippet}

<header class="h-14 shrink-0 flex items-center gap-3 pl-14 pr-4 border-b border-zinc-200/80 dark:border-zinc-800
               bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm">

  <!-- Breadcrumb -->
  <div class="flex items-center gap-1.5 min-w-0 text-sm shrink">
    {#if projects.length > 1}
      <Dropdown
        value={String(activeProject?.id ?? '')}
        options={projectOptions}
        minWidth="160px"
        align="left"
        onchange={(v) => {
          const p = projects.find(pr => String(pr.id) === v)
          if (p) onSelectProject(p)
        }}
      >
        {#snippet trigger({ open, label })}
          <button
            type="button"
            class="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors truncate max-w-[160px]"
          >
            <span class="truncate">{label}</span>
            <svg class="size-3 shrink-0 text-zinc-400 transition-transform {open ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        {/snippet}
      </Dropdown>
    {:else}
      <span class="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
        {activeProject?.name ?? 'Editor'}
      </span>
    {/if}

    {#if activeFile}
      <span class="text-zinc-300 dark:text-zinc-600 shrink-0">/</span>
      <span class="text-zinc-500 dark:text-zinc-400 truncate max-w-[200px] font-mono">{activeFile.name}</span>
      {#if dirty}
        <span class="size-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes"></span>
      {/if}
      {#if validationErrors > 0}
        <button
          type="button"
          onclick={() => onJumpToError?.()}
          class="text-xs font-medium text-red-500 shrink-0 underline decoration-red-400/60 underline-offset-2
                 hover:text-red-600 hover:decoration-red-500 transition-colors cursor-pointer"
          title="Jump to error — click to highlight"
        >{validationErrors} err</button>
      {:else if validationWarnings > 0}
        <button
          type="button"
          onclick={() => onJumpToWarning?.()}
          class="text-xs font-medium text-amber-600 shrink-0 underline decoration-amber-400/60 underline-offset-2
                 hover:text-amber-700 hover:decoration-amber-500 transition-colors cursor-pointer"
          title="Jump to warning — click to highlight"
        >{validationWarnings} warn</button>
      {/if}
    {/if}
  </div>

  <div class="flex-1 min-w-2"></div>

  <!-- Environment -->
  <div class="flex items-center gap-2 shrink-0">
    <Dropdown
      value={environment}
      options={ENV_OPTIONS}
      minWidth="130px"
      align="right"
      size="md"
      onchange={onEnvironmentChange}
    />
    {#if effectiveUrl || (canEditEnv && environmentNeedsSetup)}
      <button
        type="button"
        onclick={() => canEditEnv && onEditEnvironment()}
        disabled={!canEditEnv}
        title={canEditEnv
          ? (environmentNeedsSetup ? `Set up ${envLabel(environment)} URL` : 'Edit environment URL')
          : 'Production URL is set on the project'}
        class="hidden lg:flex items-center max-w-[220px] h-9 px-2.5 rounded-lg border text-sm truncate
               {canEditEnv && environmentNeedsSetup
                 ? 'border-dashed border-amber-300/80 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 font-medium hover:border-amber-400'
                 : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-zinc-500 dark:text-zinc-400'}
               {canEditEnv && !environmentNeedsSetup ? 'hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300' : ''}
               {!canEditEnv ? 'opacity-80 cursor-default' : ''}"
      >
        {#if canEditEnv && environmentNeedsSetup}
          Set {envLabel(environment)} URL…
        {:else}
          {effectiveUrl}
        {/if}
      </button>
    {/if}
  </div>

  {@render divider()}

  <!-- Mode toggle -->
  <SegmentedControl
    value={mode}
    options={[
      { value: 'code', label: 'Code' },
      { value: 'visual', label: 'Visual' },
    ]}
    onchange={(v) => (v === 'code' ? onSwitchCode() : onSwitchVisual())}
    size="sm"
    ariaLabel="Editor mode"
  />

  {@render divider()}

  <!-- Theme -->
  <button
    onclick={() => darkMode.update(v => !v)}
    aria-label="Toggle dark mode"
    class="size-8 rounded-md flex items-center justify-center text-zinc-400 dark:text-zinc-500
           hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors shrink-0"
  >
    {#if $darkMode}
      <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    {:else}
      <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    {/if}
  </button>

  <!-- Notifications -->
  <button
    aria-label="Notifications"
    class="size-8 rounded-md flex items-center justify-center relative text-zinc-400 dark:text-zinc-500
           hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors shrink-0"
  >
    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
    <span class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-amber-500"></span>
  </button>

  {@render divider()}

  <!-- Actions -->
  <div class="flex items-center gap-2 shrink-0">
    <Button variant="secondary" size="sm" onclick={onSave} loading={saving} disabled={!dirty}>
      Save
    </Button>
    <Button size="sm" onclick={onRun} loading={running}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5">
        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
      </svg>
      Run
    </Button>
  </div>
</header>
