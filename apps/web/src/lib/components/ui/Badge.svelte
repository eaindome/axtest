<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    variant?: 'pass' | 'fail' | 'pending' | 'running' | 'neutral'
    class?: string
    children?: Snippet
  }

  let { variant = 'neutral', class: cls = '', children }: Props = $props()

  const variants: Record<string, string> = {
    pass:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    fail:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    running: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    neutral: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
  }
</script>

<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {variants[variant]} {cls}">
  {@render children?.()}
</span>
