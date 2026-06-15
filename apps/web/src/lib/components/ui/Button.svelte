<script lang="ts">
  import type { Snippet } from 'svelte'
  import Spinner from './Spinner.svelte'

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    class?: string
    onclick?: (e: MouseEvent) => void
    children?: Snippet
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    class: cls = '',
    onclick,
    children
  }: Props = $props()

  const base = [
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ].join(' ')

  const variants: Record<string, string> = {
    primary:   'bg-amber-600 text-white hover:bg-amber-700',
    secondary: 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700',
    ghost:     'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100',
    danger:    'bg-red-600 text-white hover:bg-red-700'
  }

  const sizes: Record<string, string> = {
    sm: 'h-9 px-3.5 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-base gap-2'
  }
</script>

<button
  {type}
  disabled={disabled || loading}
  {onclick}
  class="{base} {variants[variant]} {sizes[size]} {cls}"
>
  {#if loading}
    <Spinner size="sm" />
  {/if}
  {@render children?.()}
</button>
