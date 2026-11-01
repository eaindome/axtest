<script lang="ts">
  import { goto } from '$app/navigation'
  import { get } from 'svelte/store'
  import { useMock } from '$lib/stores/dev'
  import { authStore } from '$lib/stores/auth'
  import { browser } from '$app/environment'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  if (browser) {
    goto((!get(useMock) || get(authStore).user) ? '/dashboard' : '/login', { replaceState: true })
  }
</script>

<div class="min-h-screen bg-zinc-50 flex items-center justify-center">
  <Spinner size="lg" class="text-amber-500" />
</div>
