<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import { useMock } from '$lib/stores/dev'
  import { authStore } from '$lib/stores/auth'
  import { rememberedRunInputs, rememberRunInputs, clearRunInputs } from '$lib/stores/run-inputs'
  let { names, targetUrl, scope, onSubmit, onCancel }: { names: string[], targetUrl: string, scope: string, onSubmit: (values: Record<string, string>, headed: boolean) => void, onCancel: () => void } = $props()
  let dialog = $state<HTMLDialogElement>()
  let showBrowser = $state(false)
  let reuseInputs = $state(false)
  let hasRemembered = $state(false)
  const cacheScope = $derived(`${$useMock ? 'mock' : 'api'}:${$authStore.user?.id ?? 'anonymous'}:${scope}`)
  const headingId = $props.id()
  $effect(() => { if (dialog && !dialog.open) dialog.showModal() })
  let values = $state<Record<string, string>>({})
  function resetValues() {
    const cached = rememberedRunInputs(cacheScope)
    const remembered = names.some(name => name in cached)
    hasRemembered = remembered
    values = Object.fromEntries(names.map(name => [name, name === 'AXTEST_CASE' ? `self-${Date.now()}` : cached[name] ?? '']))
    reuseInputs = remembered
  }
  $effect(() => { names; cacheScope; resetValues() })
  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (reuseInputs) rememberRunInputs(cacheScope, values)
    else if (names.length) clearRunInputs(cacheScope)
    onSubmit({ ...values }, !$useMock && showBrowser)
    values = {}
  }
</script>
<dialog bind:this={dialog} aria-labelledby={headingId} oncancel={event => { event.preventDefault(); onCancel() }} class="m-auto max-h-[85vh] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" style="width: min(32rem, calc(100vw - 2rem));">
<div class="p-6">
  <h2 id={headingId} class="section-heading">Run options</h2>
  <p class="mt-2 break-all text-sm text-zinc-500">{targetUrl}</p>
  <form class="mt-5 space-y-5" onsubmit={submit}>
    {#if names.length}<section aria-label="Runtime inputs">
    <h3 class="text-sm font-medium mb-1">Run inputs</h3>
    <p class="text-xs text-zinc-500 mb-4">Additional values required by this run. Saved test accounts are chosen in the editor.</p>
    <div class="grid sm:grid-cols-2 gap-4">
      {#each names as name}
        <Input label={name} bind:value={() => values[name] ?? '', value => { values[name] = value }} type={/PASSWORD|TOKEN|SECRET/.test(name) ? 'password' : 'text'} autocomplete="off" required />
      {/each}
    </div>
    <label class="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={reuseInputs} class="accent-amber-700" />Reuse inputs in this tab</label>
    <p class="mt-1 text-xs text-zinc-500">Scoped to this project and environment. Cleared on sign-out or refresh; never written to browser storage. Test case names stay unique.</p>
    {#if hasRemembered}<button type="button" class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400" onclick={() => { clearRunInputs(cacheScope); resetValues() }}>Clear remembered inputs</button>{/if}
    <p class="mt-3 text-xs text-zinc-500">Screenshots are disabled for runs with inputs.</p>
    </section>{/if}
    <div class="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <label class="flex items-center gap-3 text-sm font-medium"><input type="checkbox" bind:checked={showBrowser} disabled={$useMock} class="accent-amber-700" />Show browser during this run</label>
      <p class="mt-2 text-xs text-zinc-500">{$useMock ? 'Mock mode simulates results. Switch to API mode to run tests in Chromium.' : 'Then click Start run. Chromium opens on the API computer when the queued run starts, and closes when finished.'}</p>
    </div>
    <div class="flex gap-3"><Button type="submit">Start run</Button><Button variant="secondary" onclick={onCancel}>Cancel run</Button></div>
  </form>
</div>
</dialog>
