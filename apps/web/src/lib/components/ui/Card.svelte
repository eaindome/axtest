<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    class?: string
    children?: Snippet
  }

  let { class: cls = '', children }: Props = $props()
</script>

<div class="bg-white rounded-xl border border-zinc-200 shadow-sm {cls}">
  {@render children?.()}
</div>
