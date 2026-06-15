<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte'
  import type { EnvironmentName, Project } from '$lib/api'
  import { envLabel, defaultLocalUrl, suggestStagingUrl } from '$lib/editor/resolve-env-url'

  interface Props {
    open: boolean
    environment: 'staging' | 'local'
    project: Project | null
    mode?: 'setup' | 'edit'
    currentUrl?: string | null
    useProductionFallback?: boolean
    onSave: (url: string) => void | Promise<void>
    onUseProduction: () => void | Promise<void>
    onDelete?: () => void | Promise<void>
    onCancel: () => void
  }

  let {
    open,
    environment,
    project,
    mode = 'setup',
    currentUrl = null,
    useProductionFallback = false,
    onSave,
    onUseProduction,
    onDelete,
    onCancel,
  }: Props = $props()

  let url = $state('')
  let saving = $state(false)

  const productionUrl = $derived(project?.baseUrl ?? '')
  const suggested = $derived(
    environment === 'local' ? defaultLocalUrl() : suggestStagingUrl(productionUrl)
  )

  $effect(() => {
    if (!open) return
    if (mode === 'edit' && currentUrl) url = currentUrl
    else if (mode === 'edit' && useProductionFallback) url = ''
    else url = suggested
  })
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-zinc-900/40 dark:bg-black/50"
      aria-label="Close dialog"
      onclick={onCancel}
    ></button>

    <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {mode === 'setup' ? 'Set up' : 'Edit'} {envLabel(environment)} environment
        </h2>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          {#if mode === 'setup'}
            This is the first time you're running tests against <strong class="font-medium text-zinc-700 dark:text-zinc-300">{envLabel(environment)}</strong>.
            Set a base URL for this environment, or use your production URL for now.
          {:else}
            Update the base URL used when running tests against {envLabel(environment)}.
          {/if}
        </p>
      </div>

      <div class="px-5 py-4 space-y-4">
        <div>
          <label for="env-url" class="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
            {envLabel(environment)} URL
          </label>
          <input
            id="env-url"
            bind:value={url}
            placeholder={suggested}
            class="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                   text-zinc-800 dark:text-zinc-100 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60"
          />
          {#if productionUrl}
            <p class="text-xs text-zinc-400 mt-1.5">
              Production URL: <span class="font-mono">{productionUrl}</span>
            </p>
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <Button
            size="sm"
            class="w-full"
            loading={saving}
            onclick={async () => {
              saving = true
              try { await onSave(url.trim()) } finally { saving = false }
            }}
          >
            Save {envLabel(environment)} URL
          </Button>
          <Button
            variant="secondary"
            size="sm"
            class="w-full"
            disabled={saving}
            onclick={async () => {
              saving = true
              try { await onUseProduction() } finally { saving = false }
            }}
          >
            Use production URL
          </Button>
          {#if mode === 'edit' && onDelete}
            <button
              type="button"
              disabled={saving}
              onclick={async () => {
                saving = true
                try { await onDelete?.() } finally { saving = false }
              }}
              class="text-xs text-red-500 hover:text-red-600 py-1 transition-colors disabled:opacity-50"
            >
              Remove override (ask again next time)
            </button>
          {/if}
          <button
            type="button"
            disabled={saving}
            onclick={onCancel}
            class="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
