<script lang="ts">
  import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte'
  import RulesEditor from './RulesEditor.svelte'
  import { AUTH_OPTIONS } from '$lib/editor/step-options'
  import type { ParsedFile, Rule } from '$lib/editor/types'

  interface Props {
    draft?: boolean
    authOptions?: { value: string; label: string }[]
    parsed: ParsedFile
    onMetaChange: (field: 'title' | 'baseUrl' | 'auth' | 'module', value: string) => void
    onRulesChange: (rules: Rule[]) => void
  }

  let { parsed, draft = false, onMetaChange, onRulesChange, authOptions = AUTH_OPTIONS }: Props = $props()

  const inputCls = 'flex-1 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20'
</script>

<div class="space-y-4">
  <div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
    <div class="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
      <p class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{parsed.flow ? 'Reusable flow' : 'Suite details'}</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{parsed.flow ? 'Name this flow so other tests can reuse its actions.' : 'Name this group of behaviours and choose any shared login flow.'}</p>
    </div>
    <div class="px-4 py-3 space-y-2">
      {#if draft}<p class="text-xs text-zinc-500">Use the Suite name field above to name this draft.</p>{:else}<div class="space-y-2">
        <label for="suite-display-title" class="block text-xs font-medium text-zinc-500">{parsed.flow ? 'Display name' : 'Suite name'}</label>
        <input id="suite-display-title" value={parsed.title} oninput={(e) => onMetaChange('title', (e.target as HTMLInputElement).value)} placeholder="For example, Task management" class={`w-full ${inputCls}`} />
      </div>{/if}
      <div class="space-y-2 pt-2">
        <p class="text-xs font-medium text-zinc-500">{parsed.flow ? 'Flow reference' : 'Login flow'}</p>
        {#if parsed.flow}
          <input aria-label="Flow reference" value={parsed.flow === 'auth' ? parsed.auth : parsed.module ?? ''} oninput={event => onMetaChange(parsed.flow === 'auth' ? 'auth' : 'module', event.currentTarget.value)} class={inputCls} />
        {:else}
        <DropdownMenu label="Suite login flow"
          value={parsed.auth}
          options={authOptions}
          class="flex-1"
          onchange={(v) => onMetaChange('auth', v)}
        />
        {/if}
        <p class="text-xs text-zinc-500">{parsed.flow ? 'Other tests use this reference to run the flow.' : 'Runs before each behaviour in this suite. Choose the test account separately in Run setup.'}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
    <div class="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
      <p class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Validation rules <span class="text-xs font-normal text-zinc-400">Optional</span></p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Describe your application's rules to help generate test variations. Each test's expected results determine whether it passes.</p>
    </div>
    <div class="px-4 py-3">
      <RulesEditor rules={parsed.rules} onchange={onRulesChange} />
    </div>
  </div>
  <details class="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
    <summary class="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">Advanced file settings{#if parsed.baseUrl}<span class="ml-2 font-normal">Default URL set</span>{/if}</summary>
    <div class="pt-3 space-y-2"><label for="suite-default-url" class="block text-xs font-medium text-zinc-500">Standalone default URL</label><input id="suite-default-url" value={parsed.baseUrl} oninput={(e) => onMetaChange('baseUrl', (e.target as HTMLInputElement).value)} placeholder="https://..." class={`w-full ${inputCls}`} /><p class="text-xs text-zinc-500">Axtest runs use the environment selected in Run setup. This file default applies when no runner URL is supplied.</p></div>
  </details>
</div>
