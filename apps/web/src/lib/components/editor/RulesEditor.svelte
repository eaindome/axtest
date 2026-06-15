<script lang="ts">
  import Dropdown from '$lib/components/ui/Dropdown.svelte'
  import type { Rule, RuleType } from '$lib/editor/types'
  import {
    RULE_TYPE_OPTIONS,
    FIELD_FORMAT_OPTIONS,
    VISIBILITY_OPTIONS,
    STATE_OPTIONS,
    RULE_META,
  } from '$lib/editor/rule-options'
  import { makeRule } from '$lib/editor/parse-axtest'

  interface Props {
    rules: Rule[]
    onchange: (rules: Rule[]) => void
  }

  let { rules, onchange }: Props = $props()

  const inputCls = 'flex-1 min-w-0 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20'

  function updateRule(id: string, patch: Partial<Rule>) {
    onchange(rules.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function deleteRule(id: string) {
    onchange(rules.filter(r => r.id !== id))
  }

  function addRule(type: RuleType = 'field_required') {
    onchange([...rules, makeRule(type)])
  }

  function onTypeChange(rule: Rule, type: RuleType) {
    const next = makeRule(type)
    updateRule(rule.id, { type, target: rule.target, value: next.value, value2: next.value2 })
  }
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <p class="text-xs text-zinc-400">Constraints for generation and validation — same verb style as steps.</p>
    <button type="button" onclick={() => addRule()} class="text-xs font-medium text-amber-600 hover:text-amber-700 shrink-0">+ Add rule</button>
  </div>

  {#if rules.length === 0}
    <p class="text-xs text-zinc-400 italic py-2">No rules yet. Add field requirements, error messages, or URL expectations.</p>
  {:else}
    <div class="space-y-1.5">
      {#each rules as rule (rule.id)}
        <div class="flex items-center gap-2 group border-l-2 {RULE_META[rule.type].border} pl-2.5 py-1.5 rounded-r-md bg-zinc-50/50 dark:bg-zinc-800/20">
          <Dropdown
            value={rule.type}
            options={RULE_TYPE_OPTIONS}
            minWidth="130px"
            onchange={(v) => onTypeChange(rule, v as RuleType)}
          />

          {#if rule.type === 'field_required'}
            <span class="text-xs text-zinc-400 shrink-0">field</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="Email" class={inputCls} />
            <span class="text-xs text-zinc-500 shrink-0">is required</span>

          {:else if rule.type === 'field_format'}
            <span class="text-xs text-zinc-400 shrink-0">field</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="Email" class="w-28 {inputCls}" />
            <span class="text-xs text-zinc-400 shrink-0">must_be</span>
            <Dropdown value={rule.value || 'email'} options={FIELD_FORMAT_OPTIONS} minWidth="110px" onchange={(v) => updateRule(rule.id, { value: v })} />

          {:else if rule.type === 'field_length'}
            <span class="text-xs text-zinc-400 shrink-0">field</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="Password" class="w-28 {inputCls}" />
            <span class="text-xs text-zinc-400 shrink-0">length</span>
            <input value={rule.value} oninput={(e) => updateRule(rule.id, { value: (e.target as HTMLInputElement).value })} placeholder="8" class="w-12 {inputCls}" />
            <span class="text-xs text-zinc-400">–</span>
            <input value={rule.value2} oninput={(e) => updateRule(rule.id, { value2: (e.target as HTMLInputElement).value })} placeholder="64" class="w-12 {inputCls}" />

          {:else if rule.type === 'field_range'}
            <span class="text-xs text-zinc-400 shrink-0">field</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="Amount" class="w-28 {inputCls}" />
            <input value={rule.value} oninput={(e) => updateRule(rule.id, { value: (e.target as HTMLInputElement).value })} placeholder="min" class="w-16 {inputCls}" />
            <span class="text-xs text-zinc-400">–</span>
            <input value={rule.value2} oninput={(e) => updateRule(rule.id, { value2: (e.target as HTMLInputElement).value })} placeholder="max" class="w-16 {inputCls}" />

          {:else if rule.type === 'show_error'}
            <span class="text-xs text-zinc-400 shrink-0">on</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="invalid_login" class="w-32 {inputCls}" />
            <span class="text-xs text-zinc-400 shrink-0">show error</span>
            <input value={rule.value} oninput={(e) => updateRule(rule.id, { value: (e.target as HTMLInputElement).value })} placeholder="Invalid credentials" class={inputCls} />

          {:else if rule.type === 'url_contains'}
            <span class="text-xs text-zinc-400 shrink-0">url contains</span>
            <input value={rule.value} oninput={(e) => updateRule(rule.id, { value: (e.target as HTMLInputElement).value })} placeholder="/dashboard" class={inputCls} />

          {:else if rule.type === 'element_visible'}
            <span class="text-xs text-zinc-400 shrink-0">element</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="Dashboard" class={inputCls} />
            <Dropdown value={rule.value || 'is_visible'} options={VISIBILITY_OPTIONS} minWidth="110px" onchange={(v) => updateRule(rule.id, { value: v })} />

          {:else if rule.type === 'element_state'}
            <span class="text-xs text-zinc-400 shrink-0">element</span>
            <input value={rule.target} oninput={(e) => updateRule(rule.id, { target: (e.target as HTMLInputElement).value })} placeholder="Submit" class={inputCls} />
            <Dropdown value={rule.value || 'is_enabled'} options={STATE_OPTIONS} minWidth="110px" onchange={(v) => updateRule(rule.id, { value: v })} />

          {:else}
            <input value={rule.value} oninput={(e) => updateRule(rule.id, { value: (e.target as HTMLInputElement).value })} placeholder="Free-form note (legacy)" class={inputCls} />
          {/if}

          <button
            type="button"
            onclick={() => deleteRule(rule.id)}
            aria-label="Remove rule"
            class="size-6 shrink-0 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
