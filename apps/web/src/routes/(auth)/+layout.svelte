<script lang="ts">
  import { get } from 'svelte/store'
  import { useMock } from '$lib/stores/dev'
  import { authStore, setAuth, clearAuth } from '$lib/stores/auth'
  import { session } from '$lib/api/real'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import DevToggle from '$lib/components/layout/DevToggle.svelte'
  import Logo from '$lib/components/layout/Logo.svelte'

  let { children } = $props()
  let checking = $state(true)
  let connectionError = $state('')

  onMount(() => {
    void initialize()
  })
  async function initialize() {
    if (!get(useMock)) {
      try { const current = await session(); if (current.user) setAuth(current.user); else { clearAuth() } }
      catch (error) { connectionError = error instanceof Error ? error.message : 'Cannot reach the API.'; checking = false; return }
    }
    if (get(authStore).user) await goto('/dashboard', { replaceState: true })
    else checking = false
  }

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

    {#if connectionError}<div class="error-banner max-w-sm mb-4" role="alert">{connectionError}<button class="underline ml-2" onclick={() => { connectionError = ''; checking = true; void initialize() }}>Try again</button></div>{/if}
    {@render children()}
    <p class="mt-7 text-xs text-zinc-500 text-center">Readable tests. Repeatable confidence.</p>
  </div>
  <DevToggle />
{/if}
