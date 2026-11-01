<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import { useMock } from '$lib/stores/dev'
  let { names, targetUrl, onSubmit, onCancel }: { names: string[], targetUrl: string, onSubmit: (values: Record<string, string>, headed: boolean) => void, onCancel: () => void } = $props()
  let dialog = $state<HTMLDialogElement>()
  let showBrowser = $state(false)
  const headingId = $props.id()
  $effect(() => { if (dialog && !dialog.open) dialog.showModal() })
  let values = $state<Record<string, string>>({})
  $effect(() => { values = Object.fromEntries(names.map(name => [name, name === 'AXTEST_CASE' ? `self-${Date.now()}` : ''])) })
</script>
<dialog bind:this={dialog} aria-labelledby={headingId} oncancel={event => { event.preventDefault(); onCancel() }} class="m-auto max-h-[85vh] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" style="width: min(32rem, calc(100vw - 2rem));">
<div class="p-6">
  <h2 id={headingId} class="section-heading">Run options</h2>
  <p class="mt-2 break-all text-sm text-zinc-500">{targetUrl}</p>
  <form class="mt-5 space-y-5" onsubmit={(event) => { event.preventDefault(); onSubmit({ ...values }, !$useMock && showBrowser); values = {} }}>
    {#if names.length}<section aria-label="Runtime inputs">
    <h3 class="text-sm font-medium mb-1">Run inputs</h3>
    <p class="text-xs text-zinc-500 mb-4">Used for this run only. Values are not saved.</p>
    <div class="grid sm:grid-cols-2 gap-4">
      {#each names as name}
        <Input label={name} bind:value={() => values[name] ?? '', value => { values[name] = value }} type={/PASSWORD|TOKEN|SECRET/.test(name) ? 'password' : 'text'} autocomplete="off" required />
      {/each}
    </div>
    <p class="mt-3 text-xs text-zinc-500">Screenshots are disabled for runs with inputs.</p>
    </section>{/if}
    <div class="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <label class="flex items-center gap-3 text-sm font-medium"><input type="checkbox" bind:checked={showBrowser} disabled={$useMock} class="accent-amber-700" />Show browser during this run</label>
      <p class="mt-2 text-xs text-zinc-500">{$useMock ? 'Mock mode simulates results. Switch to API mode to run tests in Chromium.' : 'Opens Chromium on the computer running the API so you can watch the steps.'}</p>
    </div>
    <div class="flex gap-3"><Button type="submit">Start run</Button><Button variant="secondary" onclick={onCancel}>Cancel run</Button></div>
  </form>
</div>
</dialog>
