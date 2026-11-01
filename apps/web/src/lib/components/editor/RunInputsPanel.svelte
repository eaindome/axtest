<script lang="ts">
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  let { names, onSubmit, onCancel }: { names: string[], onSubmit: (values: Record<string, string>) => void, onCancel: () => void } = $props()
  let values = $state<Record<string, string>>({})
  $effect(() => { values = Object.fromEntries(names.map(name => [name, name === 'AXTEST_CASE' ? `self-${Date.now()}` : ''])) })
</script>
<section class="surface p-6 mx-4 mt-3 shrink-0 max-h-[60vh] overflow-auto" aria-label="Runtime inputs">
  <h2 class="section-heading">Run inputs</h2>
  <p class="text-sm text-zinc-500 mt-2">Values are used for this run only. They are cleared after submission and are not saved in test files or run history. Screenshots are disabled for runs with inputs.</p>
  <form class="mt-4 space-y-4" onsubmit={(event) => { event.preventDefault(); onSubmit({ ...values }); values = {} }}>
    <div class="grid sm:grid-cols-2 gap-4">
      {#each names as name}
        <Input label={name} bind:value={values[name]} type={/PASSWORD|TOKEN|SECRET/.test(name) ? 'password' : 'text'} autocomplete="off" required />
      {/each}
    </div>
    <div class="flex gap-3"><Button type="submit">Start run</Button><Button variant="secondary" onclick={onCancel}>Cancel run</Button></div>
  </form>
</section>
