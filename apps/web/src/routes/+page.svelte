<script lang="ts">
  import { goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  if (browser) {
    goto(localStorage.getItem('axtest_token') ? '/dashboard' : '/login', { replaceState: true })
  }
</script>

<div class="min-h-screen bg-zinc-50 flex items-center justify-center">
  <Spinner size="lg" class="text-amber-500" />
</div>
