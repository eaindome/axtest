<script lang="ts">
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { setAuth } from '$lib/stores/auth'
  import Card from '$lib/components/ui/Card.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'

  let email    = $state('')
  let password = $state('')
  let error    = $state('')
  let loading  = $state(false)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    loading = true
    try {
      const { token, user } = await api().login({ email, password })
      setAuth(user, token)
      goto('/dashboard')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login failed. Check your credentials.'
    } finally {
      loading = false
    }
  }
</script>

<Card class="w-full max-w-sm p-8">
  <h2 class="text-xl font-semibold text-zinc-900 mb-1">Sign in</h2>
  <p class="text-sm text-zinc-500 mb-6">Welcome back</p>

  <form onsubmit={submit} class="space-y-4">
    <Input
      label="Email"
      type="email"
      bind:value={email}
      placeholder="you@example.com"
      required
      autocomplete="email"
    />
    <Input
      label="Password"
      type="password"
      bind:value={password}
      placeholder="••••••••"
      required
      autocomplete="current-password"
    />

    {#if error}
      <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
    {/if}

    <Button type="submit" {loading} class="w-full mt-2">Sign in</Button>
  </form>

  <p class="text-sm text-zinc-500 text-center mt-6">
    Don't have an account?{' '}
    <a href="/register" class="text-amber-600 font-medium hover:text-amber-700">Create one</a>
  </p>
</Card>
