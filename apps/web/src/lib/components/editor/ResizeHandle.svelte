<script lang="ts">
  interface Props {
    direction: 'horizontal' | 'vertical'
    side: 'left' | 'right' | 'bottom'
    onResizeStart?: () => void
    onResize: (delta: number) => void
  }

  let { direction, side, onResizeStart, onResize }: Props = $props()

  let dragging = $state(false)

  function start(e: MouseEvent) {
    e.preventDefault()
    dragging = true
    onResizeStart?.()
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY

    function onMove(ev: MouseEvent) {
      const current = direction === 'horizontal' ? ev.clientX : ev.clientY
      let delta = current - startPos
      if (side === 'right' || side === 'bottom') delta = -delta
      onResize(delta)
    }

    function onUp() {
      dragging = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
</script>

{#if direction === 'horizontal'}
  <button
    type="button"
    aria-label="Resize panel"
    onmousedown={start}
    class="w-1 shrink-0 cursor-col-resize group flex items-center justify-center
           {side === 'left' ? 'border-r' : 'border-l'} border-zinc-200/80 dark:border-zinc-800
           {dragging ? 'bg-amber-400/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'}"
  >
    <div class="h-8 w-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400"></div>
  </button>
{:else}
  <button
    type="button"
    aria-label="Resize panel"
    onmousedown={start}
    class="h-1 shrink-0 cursor-row-resize group flex items-center justify-center border-t border-zinc-200/80 dark:border-zinc-800 w-full
           {dragging ? 'bg-amber-400/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'}"
  >
    <div class="w-8 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400"></div>
  </button>
{/if}
