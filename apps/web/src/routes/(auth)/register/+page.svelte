<script lang="ts">
  import { useMock } from '$lib/stores/dev'
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { setAuth } from '$lib/stores/auth'
  import Card from '$lib/components/ui/Card.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'

  let name     = $state('')
  let username    = $state('')
  let password = $state('')
  let error    = $state('')
  let loading  = $state(false)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    loading = true
    try {
      const { token, user } = await api().register({ name, username, password })
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
  <h2 class="text-2xl tracking-tight font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Create account</h2>
  <p class="text-sm text-zinc-500 mb-6">Start testing in minutes</p>

  {#if $useMock}<p class="text-xs text-amber-700 dark:text-amber-400 mb-4">Mock mode uses demo credentials. Select API to sign in to your account.</p>{/if}
  <form onsubmit={submit} class="space-y-4">
    <Input
      label="Full name"
      bind:value={name}
      placeholder="Ekow Indome"
      required
      autocomplete="name"
    />
    <Input
      label="Username"
      type="text"
      bind:value={username}
      placeholder="Your username"
      required
      autocomplete="username"
    />
    <Input
      label="Password"
      type="password"
      bind:value={password}
      placeholder="Min 12 characters"
      required
      autocomplete="new-password"
      hint="At least 12 characters; up to 72 bytes"
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
