<script lang="ts">
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { setAuth } from '$lib/stores/auth'
  import Card from '$lib/components/ui/Card.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'

  let name     = $state('')
  let email    = $state('')
  let password = $state('')
  let error    = $state('')
  let loading  = $state(false)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    loading = true
    try {
      const { token, user } = await api().register({ name, email, password })
      setAuth(user, token)
      goto('/dashboard')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Registration failed. Try again.'
    } finally {
      loading = false
    }
  }
</script>

<Card class="w-full max-w-sm p-8">
  <h2 class="text-xl font-semibold text-zinc-900 mb-1">Create account</h2>
  <p class="text-sm text-zinc-500 mb-6">Start testing in minutes</p>

  <form onsubmit={submit} class="space-y-4">
    <Input
      label="Full name"
      bind:value={name}
      placeholder="Ekow Indome"
      required
      autocomplete="name"
    />
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
      placeholder="Min 8 characters"
      required
      autocomplete="new-password"
      hint="At least 8 characters"
    />

    {#if error}
      <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
    {/if}

    <Button type="submit" {loading} class="w-full mt-2">Create account</Button>
  </form>

  <p class="text-sm text-zinc-500 text-center mt-6">
    Already have an account?{' '}
    <a href="/login" class="text-amber-600 font-medium hover:text-amber-700">Sign in</a>
  </p>
</Card>
