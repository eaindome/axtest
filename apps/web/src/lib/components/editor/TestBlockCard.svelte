<script lang="ts">
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
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
    flow?: boolean
    test: TestBlock
    index: number
    allTests: TestBlock[]
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
    flow = false,
    test,
    index,
    allTests,
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
  let rowScopes = $state<Record<string, boolean>>({})

  const inputCls = 'min-w-[8rem] flex-1 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20'
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

{#snippet field(label: string, value: string, placeholder: string, onchange: (value: string) => void)}
  <label class="block min-w-[9rem] flex-1 space-y-1">
    <span class="block text-xs text-zinc-500">{label}</span>
    <input {value} {placeholder} oninput={event => onchange(event.currentTarget.value)} class={`w-full ${inputCls}`} />
  </label>
{/snippet}

<div
  id="test-{test.id}"
  class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden"
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

    <div class="flex-1 min-w-0">
      <label for={`behaviour-${test.id}`} class="block text-xs font-medium text-zinc-500 mb-1">{flow ? 'Flow name' : 'Behaviour name'}</label>
      <input
        id={`behaviour-${test.id}`}
        value={test.name}
        oninput={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
        onclick={onSelect}
        class="w-full min-w-0 text-sm font-semibold text-zinc-800 dark:text-zinc-100 bg-transparent rounded outline-none focus:ring-1 focus:ring-zinc-400/40"
        placeholder={flow ? 'Name this reusable flow' : 'For example, create a todo item'}
      />
    </div>

    <button
      type="button"
      onclick={onRun}
      disabled={running || generating}
      title={flow ? 'Run this flow' : 'Run this test'}
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
      {flow ? 'Run this flow' : 'Run this test'}
    </button>

    {#if !flow}<button
      type="button"
      onclick={onDelete}
      aria-label="Delete test"
      class="size-6 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
    >
      <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>{/if}
  </div>

  {#if !collapsed}
    <!-- Steps -->
    <div class="px-4 pt-3 pb-2">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Actions</p>
      <p class="mb-3 text-xs text-zinc-500">What should the user do? Add actions in the order they happen.</p>
      <details class="mb-3 text-xs text-zinc-500">
        <summary class="cursor-pointer font-medium">How to identify an element</summary>
        <div class="pt-2 space-y-2"><p>Use the text on a button or link, or a field's label or placeholder. For icon buttons, use their accessible label.</p><p>If the same button appears in multiple table rows, use Within a row and text that identifies the intended row.</p><p>If a run cannot find the target, check its spelling, the current page, whether it is visible, and whether an earlier action needs a wait.</p></div>
      </details>
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
            class="flex flex-wrap items-center gap-2 group border-l-2 {STEP_META[step.type].border} pl-2 py-1 rounded-r-md transition-colors
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

            <DropdownMenu label="Action type"
              value={step.type}
              options={STEP_TYPE_OPTIONS}
              onchange={(v) => onUpdateStep('steps', step.id, { type: v as StepType })}
            />

            {#if step.type === 'navigate'}
              {@render field('Page address', step.target, 'For example, /tasks', value => onUpdateStep('steps', step.id, { target: value }))}
            {:else if step.type === 'wait'}
              {@render field('Wait target', step.target, 'For example, Loading tasks', value => onUpdateStep('steps', step.id, { target: value }))}
              <div class="space-y-1"><p class="text-xs text-zinc-500">Wait until</p><DropdownMenu label="Wait condition" value={step.value === 'disappear' ? 'disappear' : 'appear'} options={[{ value: 'appear', label: 'Appear' }, { value: 'disappear', label: 'Disappear' }]} onchange={value => onUpdateStep('steps', step.id, { value })} /></div>
            {:else if step.type === 'custom'}
              {@render field('Axtest action', step.target, 'For example, press "Enter"', value => onUpdateStep('steps', step.id, { target: value }))}
            {:else if step.type === 'click'}
              {@render field('Click target', step.target, 'For example, Add task', value => onUpdateStep('steps', step.id, { target: value }))}
            {:else if step.type === 'type'}
              {@render field('Text to enter', step.value, 'For example, Buy milk', value => onUpdateStep('steps', step.id, { value }))}
              {@render field('Field name', step.target, 'For example, New task', value => onUpdateStep('steps', step.id, { target: value }))}
            {:else if step.type === 'select'}
              {@render field('Option label', step.value, 'For example, High priority', value => onUpdateStep('steps', step.id, { value }))}
              {@render field('Field name', step.target, 'For example, Priority', value => onUpdateStep('steps', step.id, { target: value }))}
            {:else if step.type === 'clear'}
              {@render field('Field name', step.target, 'For example, New task', value => onUpdateStep('steps', step.id, { target: value }))}
            {/if}

            <button
              type="button"
              onclick={() => onDeleteStep('steps', step.id)}
              aria-label="Delete action"
              class="size-6 shrink-0 rounded-md flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
            >
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p class="basis-full text-xs text-zinc-500">{step.type === 'navigate' ? 'Paths such as /tasks open relative to the target URL in Run setup. A full URL opens that address.' : step.type === 'click' ? 'Use the button or link text, or its accessible label. If the same label repeats in a table, identify the row below.' : step.type === 'type' || step.type === 'clear' ? 'Identify the field by its label or placeholder, rather than the text currently entered in it.' : step.type === 'select' ? 'Use the dropdown label and the option text a user sees.' : step.type === 'wait' ? 'Use the visible text or field label you expect to appear or disappear.' : 'Custom actions use Axtest syntax. Switch to Code for advanced targeting.'}</p>
            {#if step.type === 'click'}
              <details class="basis-full rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2" bind:open={() => rowScopes[step.id] ?? !!step.context, value => { rowScopes = { ...rowScopes, [step.id]: value } }}>
                <summary class="cursor-pointer text-xs text-zinc-600 dark:text-zinc-400">Within a row <span class="text-zinc-400">{step.context ? `· ${step.context}` : 'Optional'}</span></summary>
                <div class="pt-3 space-y-2">
                  {@render field('Row containing text', step.context, 'For example, Buy milk', value => onUpdateStep('steps', step.id, { context: value }))}
                  <p class="text-xs text-zinc-500">Choose text that identifies one table row. Axtest searches that row for the click target. Leave empty to search the whole page.</p>
                  {#if step.context}<button type="button" class="text-xs font-medium text-zinc-500 underline" onclick={() => { onUpdateStep('steps', step.id, { context: '' }); rowScopes = { ...rowScopes, [step.id]: false } }}>Remove row restriction</button>{/if}
                </div>
              </details>
            {/if}
          </div>
        {:else}<p class="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 px-3 py-4 text-xs text-zinc-500">Start with an action, such as opening /tasks or clicking Add task.</p>{/each}
      </div>
      <button
        type="button"
        onclick={() => onAddStep('steps')}
        class="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
      >
        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add action
      </button>
    </div>

    <!-- Assertions -->
    <div class="px-4 pt-2.5 pb-3 border-t border-zinc-100 dark:border-zinc-800">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Expected results</p>
      <p class="mb-3 text-xs text-zinc-500">How will you know it worked? Add at least one expected result. Targets are checked when the test runs.</p>
      <div class="space-y-1.5">
        {#each test.asserts as step, ai (step.id)}
          {@const parsed = parseAssertion(step.assertion)}
          <div class="flex flex-wrap items-center gap-2 group border-l-2 {ASSERTION_META[parsed.type].border} pl-2.5 py-1 rounded-r-md bg-zinc-50/40 dark:bg-zinc-800/20">
            <span class="text-xs font-mono text-zinc-300 dark:text-zinc-600 w-4 shrink-0">{ai + 1}</span>

            {#if parsed.type === 'custom'}
              <DropdownMenu label="Expected result type"
                value="is_visible"
                options={ASSERTION_TYPE_OPTIONS}
                onchange={(v) => onAssertionTypeChange(step.id, v as AssertionType)}
              />
              {@render field('Axtest assertion', parsed.value, 'Fix or replace with a supported assertion type', value => updateAssertion(step.id, { value }))}
              <span class="text-xs text-amber-600 dark:text-amber-400 shrink-0" title="This line is not a recognized assertion pattern">Unrecognized</span>
            {:else}
              <DropdownMenu label="Expected result type"
                value={parsed.type}
                options={ASSERTION_TYPE_OPTIONS}
                onchange={(v) => onAssertionTypeChange(step.id, v as AssertionType)}
              />

              {#if parsed.type === 'modal_open'}
                <span class="text-xs text-zinc-500">A dialog or modal should be open.</span>
              {:else if parsed.type === 'toast_shows'}
                {@render field('Message text', parsed.value, 'Saved successfully', value => updateAssertion(step.id, { value }))}
              {:else if parsed.type === 'url_contains'}
                {@render field('Expected URL part', parsed.value, '/dashboard', value => updateAssertion(step.id, { value }))}
              {:else if assertionNeedsTarget(parsed.type)}
                {@render field('Element or label', parsed.target, 'Element or label', target => updateAssertion(step.id, { target }))}
                {#if parsed.type === 'contains'}
                  {@render field('Expected text', parsed.value, 'Expected text', value => updateAssertion(step.id, { value }))}
                {/if}
              {/if}
            {/if}

            <button
              type="button"
              onclick={() => onDeleteStep('asserts', step.id)}
              aria-label="Delete expected result"
              class="size-6 shrink-0 rounded-md flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
            >
              <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p class="basis-full text-xs text-zinc-500">{parsed.type === 'contains' ? 'Identify the element first, then the text it should contain. For example, Task list contains Buy milk.' : parsed.type === 'url_contains' ? 'Checks part of the browser address, such as /tasks. This is an expected result, not a navigation action.' : parsed.type === 'toast_shows' ? 'Checks the text of a notification or alert shown by your application.' : parsed.type === 'is_not_visible' ? 'Checks that this target is hidden or absent.' : parsed.type === 'is_enabled' || parsed.type === 'is_disabled' ? 'Identify the button or form control by its label.' : parsed.type === 'is_visible' ? 'Use text or a labelled element you expect to see, such as Buy milk or Task list.' : parsed.type === 'custom' ? 'This assertion needs attention. Choose a supported result type or edit it in Code.' : 'Checks that your application has an open dialog.'}</p>
          </div>
        {:else}<p class="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 px-3 py-4 text-xs text-zinc-500">For example, check that Buy milk is visible after adding a task.</p>{/each}
      </div>
      <button
        type="button"
        onclick={() => onAddStep('asserts')}
        class="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
      >
        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add expected result
      </button>
    </div>
    {#if !flow}
      <details aria-label="Advanced test settings" class="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
        <summary class="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">Advanced<span class="ml-2 font-normal text-zinc-400">{test.kind ? TEST_KIND_LABELS[test.kind] : 'Optional'}{test.dependsOn ? ' · Prerequisite set' : ''}</span></summary>
        <div class="pt-4 space-y-4">
          <div class="space-y-2"><p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Test type</p><DropdownMenu label="Test kind" value={test.kind} options={TEST_KIND_OPTIONS} class="w-full" onchange={value => onUpdate({ kind: value as TestKind })} /><p class="text-xs text-zinc-500">Classification is optional. Use Seed when you want to generate variations from this behaviour.</p></div>
          <div class="space-y-2"><p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Run after another test</p><DropdownMenu label="Test prerequisite" value={allTests.find(item => item.id === test.dependsOn)?.name ?? test.dependsOn} options={dependsOpts} class="w-full" onchange={value => onUpdate({ dependsOn: value })} /><p class="text-xs text-zinc-500">The prerequisite is included automatically when this test runs.</p></div>
          {#if test.generatedFrom}<p class="text-xs text-zinc-500">Generated from “{test.generatedFrom}”</p>{/if}
          <div class="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
            <p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Generate test variations</p>
            <p class="text-xs text-zinc-500">{test.kind !== 'seed' ? 'Choose Seed as the test type, then run this behaviour successfully to use it as a starting point.' : runStatus !== 'passed' ? 'Run this seed successfully before generating variations.' : !canGenerate ? 'No new variations are available. Add an input action or validation rule, or review the variations already generated.' : 'Ready to generate positive, negative and edge cases. Review their actions and expected results before running them.'}</p>
            <p class="text-xs text-zinc-500">Validation rules in Suite settings help describe the expected response to invalid inputs.</p>
            {#if onGenerate}<button type="button" disabled={!canGenerate || running || generating} onclick={onGenerate} class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-50">{#if generating}<Spinner size="sm" />{/if}{generating ? 'Generating…' : 'Generate variations'}</button>{/if}
          </div>
        </div>
      </details>
    {/if}
  {:else}
    <div class="px-4 py-2 text-xs text-zinc-400">
      {#if test.kind}<span class="font-medium {TEST_KIND_STYLES[test.kind]} px-1 py-0.5 rounded mr-1">{TEST_KIND_LABELS[test.kind]}</span>{/if}
      {test.steps.length} actions · {test.asserts.length} expected results
      {#if test.dependsOn} · depends on "{test.dependsOn}"{/if}
    </div>
  {/if}
</div>
