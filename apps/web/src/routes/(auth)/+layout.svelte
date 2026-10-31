<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import DevToggle from '$lib/components/layout/DevToggle.svelte'
  import Logo from '$lib/components/layout/Logo.svelte'

  let { children } = $props()
  let checking = $state(true)

  onMount(() => {
    if (localStorage.getItem('axtest_token')) {
      goto('/dashboard', { replaceState: true })
    } else {
      checking = false
    }
  })
</script>

{#if checking}
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
    <Spinner size="lg" class="text-amber-500" />
  </div>
{:else}
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
    <div class="mb-8 flex flex-col items-center text-center">
      <Logo size="lg" align="center" tagline="Automated testing for dev teams" />
    </div>

    {@render children()}
    <p class="mt-7 text-xs text-zinc-500 text-center">Readable tests. Repeatable confidence.</p>
  </div>
  <DevToggle />
{/if}
