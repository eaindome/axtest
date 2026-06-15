<script lang="ts">
  import Dropdown from '$lib/components/ui/Dropdown.svelte'
  import RulesEditor from './RulesEditor.svelte'
  import { AUTH_OPTIONS } from '$lib/editor/step-options'
  import type { ParsedFile, Rule } from '$lib/editor/types'

  interface Props {
    parsed: ParsedFile
    onMetaChange: (field: 'title' | 'baseUrl' | 'auth', value: string) => void
    onRulesChange: (rules: Rule[]) => void
  }

  let { parsed, onMetaChange, onRulesChange }: Props = $props()

  const inputCls = 'flex-1 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20'
</script>

<div class="space-y-4">
  <div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
    <div class="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Module</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Identity and environment for this spec file.</p>
    </div>
    <div class="px-4 py-3 space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400 w-14 shrink-0">title</span>
        <input value={parsed.title} oninput={(e) => onMetaChange('title', (e.target as HTMLInputElement).value)} placeholder="Module name" class={inputCls} />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400 w-14 shrink-0">base_url</span>
        <input value={parsed.baseUrl} oninput={(e) => onMetaChange('baseUrl', (e.target as HTMLInputElement).value)} placeholder="https://..." class={inputCls} />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400 w-14 shrink-0">AUTH</span>
        <Dropdown
          value={parsed.auth}
          options={AUTH_OPTIONS}
          placeholder="None"
          minWidth="180px"
          class="flex-1"
          onchange={(v) => onMetaChange('auth', v)}
        />
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
    <div class="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
      <p class="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Rules</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">What the app must enforce — used when generating negative and edge cases.</p>
    </div>
    <div class="px-4 py-3">
      <RulesEditor rules={parsed.rules} onchange={onRulesChange} />
    </div>
  </div>
</div>
