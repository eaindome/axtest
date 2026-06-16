<script lang="ts">
  import Dropdown from '$lib/components/ui/Dropdown.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { STEP_META, type Step, type StepType, type TestBlock, type TestKind } from '$lib/editor/types'
  import { STEP_TYPE_OPTIONS, dependsOnOptions, reorder } from '$lib/editor/step-options'
  import { TEST_KIND_LABELS, TEST_KIND_OPTIONS, TEST_KIND_STYLES } from '$lib/editor/test-kind'
  import type { AssertionType } from '$lib/editor/types'
  import {
    ASSERTION_TYPE_OPTIONS,
    ASSERTION_META,
    assertionNeedsTarget,
    assertionNeedsValue,
  } from '$lib/editor/assertion-options'
  import { parseAssertion, serializeAssertion } from '$lib/editor/parse-assertion'

  interface Props {
    test: TestBlock
    index: number
    allTests: TestBlock[]
    selected: boolean
    collapsed: boolean
    running: boolean
    generating?: boolean
    runStatus?: 'passed' | 'failed' | null
    canGenerate?: boolean
    onSelect: () => void
    onToggleCollapse: () => void
    onUpdate: (patch: Partial<TestBlock>) => void
    onDelete: () => void
    onRun: () => void
    onGenerate?: () => void | Promise<void>
    onUpdateStep: (sec: 'steps' | 'asserts', stepId: string, patch: Partial<Step>) => void
    onDeleteStep: (sec: 'steps' | 'asserts', stepId: string) => void
    onAddStep: (sec: 'steps' | 'asserts') => void
    onReorderSteps: (from: number, to: number) => void
  }

  let {
    test,
    index,
    allTests,
    selected,
    collapsed,
    running,
    generating = false,
    runStatus,
    canGenerate = false,
    onSelect,
    onToggleCollapse,
    onUpdate,
    onDelete,
    onRun,
    onGenerate,
    onUpdateStep,
    onDeleteStep,
    onAddStep,
    onReorderSteps,
  }: Props = $props()

  let dragIndex = $state<number | null>(null)
  let dropIndex = $state<number | null>(null)

  const inputCls = 'flex-1 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20'
  const dependsOpts = $derived(dependsOnOptions(allTests, test.id))

  function updateAssertion(stepId: string, patch: Partial<{ type: AssertionType; target: string; value: string }>) {
    const step = test.asserts.find(s => s.id === stepId)
    if (!step) return
    const next = { ...parseAssertion(step.assertion), ...patch }
    onUpdateStep('asserts', stepId, { assertion: serializeAssertion(next) })
  }

  function onAssertionTypeChange(stepId: string, type: AssertionType) {
    const step = test.asserts.find(s => s.id === stepId)
    if (!step) return
    const current = parseAssertion(step.assertion)
    updateAssertion(stepId, {
      type,
      target: assertionNeedsTarget(type) ? current.target : '',
      value: assertionNeedsValue(type) ? current.value : '',
    })
  }

  function onDragStart(e: DragEvent, i: number) {
    dragIndex = i
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(i))
    }
  }

  function onDragOver(e: DragEvent, i: number) {
    e.preventDefault()
    dropIndex = i
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  function onDragLeave() {
    dropIndex = null
  }

  function onDrop(e: DragEvent, to: number) {
    e.preventDefault()
    if (dragIndex !== null) onReorderSteps(dragIndex, to)
    dragIndex = null
    dropIndex = null
  }

  function onDragEnd() {
    dragIndex = null
    dropIndex = null
  }
</script>

<div
  id="test-{test.id}"
  class="bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-shadow
         {selected
           ? 'border-amber-400/60 dark:border-amber-500/40 shadow-sm shadow-amber-500/5'
           : 'border-zinc-200/80 dark:border-zinc-800'}"
>
  <!-- Header -->
  <div class="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
    <button
      type="button"
      onclick={onToggleCollapse}
      aria-label={collapsed ? 'Expand test' : 'Collapse test'}
      class="size-6 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
    >
      <svg class="size-3.5 transition-transform {collapsed ? '' : 'rotate-90'}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>

    <span class="text-xs font-mono text-zinc-400 shrink-0">#{index + 1}</span>

    {#if test.kind}
      <span class="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 {TEST_KIND_STYLES[test.kind]}">
        {TEST_KIND_LABELS[test.kind]}
      </span>
    {/if}

    {#if runStatus === 'passed'}
      <span class="size-2 rounded-full bg-emerald-500 shrink-0" title="Passed"></span>
    {:else if runStatus === 'failed'}
      <span class="size-2 rounded-full bg-red-500 shrink-0" title="Failed"></span>
    {/if}

    <input
      value={test.name}
      oninput={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
      onclick={onSelect}
      class="flex-1 min-w-0 text-sm font-semibold text-zinc-800 dark:text-zinc-100 bg-transparent outline-none
             focus:bg-white dark:focus:bg-zinc-900 focus:px-2 focus:-mx-2 focus:rounded transition-all"
      placeholder="Test name"
    />

    <button
      type="button"
      onclick={onRun}
      disabled={running || generating}
      title="Run this test"
      class="h-7 px-2 flex items-center gap-1 rounded-md text-xs font-medium shrink-0 transition-colors
             text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200
             disabled:opacity-50"
    >
      {#if running}
        <Spinner size="sm" />
      {:else}
        <svg class="size-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
        </svg>
      {/if}
      Run
    </button>

    {#if canGenerate && onGenerate}
      <button
        type="button"
        onclick={onGenerate}
        disabled={generating}
        title="Generate positive, negative, and edge cases from this seed"
        class="h-7 px-2 flex items-center gap-1 rounded-md text-xs font-medium shrink-0 transition-colors
               bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300
               hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50"
      >
        {#if generating}
          <Spinner size="sm" />
        {:else}
          <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        {/if}
        Generate
      </button>
    {/if}

    <button
      type="button"
      onclick={onDelete}
      aria-label="Delete test"
      class="size-6 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
    >
      <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  {#if !collapsed}
    <!-- Kind & depends on -->
    <div class="px-4 py-2 border-b border-zinc-50 dark:border-zinc-800/80 space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400 shrink-0 w-20">Kind</span>
        <Dropdown
          value={test.kind}
          options={TEST_KIND_OPTIONS}
          placeholder="Manual"
          minWidth="160px"
          class="flex-1"
          onchange={(v) => onUpdate({ kind: v as TestKind })}
        />
      </div>
      {#if test.generatedFrom}
        <p class="text-xs text-zinc-400 pl-20">Generated from “{test.generatedFrom}”</p>
      {/if}
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400 shrink-0 w-20">Depends on</span>
        <Dropdown
          value={test.dependsOn}
          options={dependsOpts}
          placeholder="None"
          minWidth="200px"
          class="flex-1"
          onchange={(v) => onUpdate({ dependsOn: v })}
        />
      </div>
    </div>

    <!-- Steps -->
    <div class="px-4 pt-3 pb-2">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Steps</p>
      <div class="space-y-1">
        {#each test.steps as step, si (step.id)}
          <div
            role="listitem"
            draggable="true"
            ondragstart={(e) => onDragStart(e, si)}
            ondragover={(e) => onDragOver(e, si)}
            ondragleave={onDragLeave}
            ondrop={(e) => onDrop(e, si)}
            ondragend={onDragEnd}
            class="flex items-center gap-2 group border-l-2 {STEP_META[step.type].border} pl-2 py-1 rounded-r-md transition-colors
                   {dragIndex === si ? 'opacity-40' : ''}
                   {dropIndex === si && dragIndex !== si ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}"
          >
            <button
              type="button"
              aria-label="Drag to reorder"
              class="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-400 shrink-0 touch-none"
              tabindex="-1"
            >
              <svg class="size-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a1 1 0 100-2 1 1 0 000 2zm0 6a1 1 0 100-2 1 1 0 000 2zm0 6a1 1 0 100-2 1 1 0 000 2zm6-12a1 1 0 100-2 1 1 0 000 2zm0 6a1 1 0 100-2 1 1 0 000 2zm0 6a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </button>

            <span class="text-xs font-mono text-zinc-300 dark:text-zinc-600 w-4 shrink-0">{si + 1}</span>

            <Dropdown
              value={step.type}
              options={STEP_TYPE_OPTIONS}
              minWidth="110px"
              onchange={(v) => onUpdateStep('steps', step.id, { type: v as StepType })}
            />

            {#if step.type === 'navigate'}
              <input value={step.target} oninput={(e) => onUpdateStep('steps', step.id, { target: (e.target as HTMLInputElement).value })} placeholder="path or URL" class={inputCls} />
            {:else if step.type === 'click'}
              <input value={step.target} oninput={(e) => onUpdateStep('steps', step.id, { target: (e.target as HTMLInputElement).value })} placeholder="button / label" class={inputCls} />
              <input value={step.context} oninput={(e) => onUpdateStep('steps', step.id, { context: (e.target as HTMLInputElement).value })} placeholder="in row (optional)" class="w-32 {inputCls}" />
            {:else if step.type === 'type'}
              <input value={step.value} oninput={(e) => onUpdateStep('steps', step.id, { value: (e.target as HTMLInputElement).value })} placeholder="text" class={inputCls} />
              <span class="text-xs text-zinc-400 shrink-0">in</span>
              <input value={step.target} oninput={(e) => onUpdateStep('steps', step.id, { target: (e.target as HTMLInputElement).value })} placeholder="field" class="w-32 {inputCls}" />
            {:else if step.type === 'select'}
              <input value={step.value} oninput={(e) => onUpdateStep('steps', step.id, { value: (e.target as HTMLInputElement).value })} placeholder="option" class={inputCls} />
              <span class="text-xs text-zinc-400 shrink-0">in</span>
              <input value={step.target} oninput={(e) => onUpdateStep('steps', step.id, { target: (e.target as HTMLInputElement).value })} placeholder="field" class="w-32 {inputCls}" />
            {:else if step.type === 'clear'}
              <input value={step.target} oninput={(e) => onUpdateStep('steps', step.id, { target: (e.target as HTMLInputElement).value })} placeholder="field name" class={inputCls} />
            {/if}

            <button
              type="button"
              onclick={() => onDeleteStep('steps', step.id)}
              aria-label="Delete step"
              class="size-6 shrink-0 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/each}
      </div>
      <button
        type="button"
        onclick={() => onAddStep('steps')}
        class="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
      >
        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add step
      </button>
    </div>

    <!-- Assertions -->
    <div class="px-4 pt-2.5 pb-3 border-t border-zinc-100 dark:border-zinc-800">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Assert</p>
      <div class="space-y-1.5">
        {#each test.asserts as step, ai (step.id)}
          {@const parsed = parseAssertion(step.assertion)}
          <div class="flex items-center gap-2 group border-l-2 {ASSERTION_META[parsed.type].border} pl-2.5 py-1 rounded-r-md bg-zinc-50/40 dark:bg-zinc-800/20">
            <span class="text-xs font-mono text-zinc-300 dark:text-zinc-600 w-4 shrink-0">{ai + 1}</span>

            {#if parsed.type === 'custom'}
              <Dropdown
                value="is_visible"
                options={ASSERTION_TYPE_OPTIONS}
                minWidth="140px"
                onchange={(v) => onAssertionTypeChange(step.id, v as AssertionType)}
              />
              <input
                value={parsed.value}
                oninput={(e) => updateAssertion(step.id, { value: (e.target as HTMLInputElement).value })}
                placeholder="Fix or replace with a supported assertion type"
                class="{inputCls} font-mono"
              />
              <span class="text-xs text-amber-600 dark:text-amber-400 shrink-0" title="This line is not a recognized assertion pattern">Unrecognized</span>
            {:else}
              <Dropdown
                value={parsed.type}
                options={ASSERTION_TYPE_OPTIONS}
                minWidth="140px"
                onchange={(v) => onAssertionTypeChange(step.id, v as AssertionType)}
              />

              {#if parsed.type === 'modal_open'}
                <span class="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">modal is open</span>
              {:else if parsed.type === 'toast_shows'}
                <span class="text-xs text-zinc-400 shrink-0">toast shows</span>
                <input
                  value={parsed.value}
                  oninput={(e) => updateAssertion(step.id, { value: (e.target as HTMLInputElement).value })}
                  placeholder="Saved successfully"
                  class={inputCls}
                />
              {:else if parsed.type === 'url_contains'}
                <span class="text-xs text-zinc-400 shrink-0">url contains</span>
                <input
                  value={parsed.value}
                  oninput={(e) => updateAssertion(step.id, { value: (e.target as HTMLInputElement).value })}
                  placeholder="/dashboard"
                  class="{inputCls} font-mono"
                />
              {:else if assertionNeedsTarget(parsed.type)}
                <input
                  value={parsed.target}
                  oninput={(e) => updateAssertion(step.id, { target: (e.target as HTMLInputElement).value })}
                  placeholder="Element or label"
                  class={inputCls}
                />
                {#if parsed.type === 'contains'}
                  <span class="text-xs text-zinc-400 shrink-0">contains</span>
                  <input
                    value={parsed.value}
                    oninput={(e) => updateAssertion(step.id, { value: (e.target as HTMLInputElement).value })}
                    placeholder="Expected text"
                    class={inputCls}
                  />
                {:else}
                  <span class="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{parsed.type.replace(/_/g, ' ')}</span>
                {/if}
              {/if}
            {/if}

            <button
              type="button"
              onclick={() => onDeleteStep('asserts', step.id)}
              aria-label="Delete assertion"
              class="size-6 shrink-0 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        {/each}
      </div>
      <button
        type="button"
        onclick={() => onAddStep('asserts')}
        class="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
      >
        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add assertion
      </button>
    </div>
  {:else}
    <div class="px-4 py-2 text-xs text-zinc-400">
      {#if test.kind}<span class="font-medium {TEST_KIND_STYLES[test.kind]} px-1 py-0.5 rounded mr-1">{TEST_KIND_LABELS[test.kind]}</span>{/if}
      {test.steps.length} steps · {test.asserts.length} asserts
      {#if test.dependsOn} · depends on "{test.dependsOn}"{/if}
    </div>
  {/if}
</div>
