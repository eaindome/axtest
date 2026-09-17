<script lang="ts">
  import { parseDocContent, renderDocTable, type DocContentBlock } from '$lib/docs/render-doc-content'

  interface Props {
    markdown: string
    compact?: boolean
  }

  let { markdown, compact = false }: Props = $props()

  const blocks = $derived(parseDocContent(markdown))
</script>

<div class="doc-body space-y-4 {compact ? 'doc-body--compact' : 'space-y-5 text-base'} leading-relaxed text-zinc-700 dark:text-zinc-300">
  {#each blocks as block}
    {#if block.kind === 'pre'}
      <pre class="doc-pre {compact ? 'doc-pre--compact' : ''}"><code>{block.html}</code></pre>
    {:else if block.kind === 'table'}
      {@html renderDocTable(block.html)}
    {:else if block.kind === 'h2'}
      <h3 class="doc-h2 {compact ? 'doc-h2--compact' : ''}">{@html block.html}</h3>
    {:else if block.kind === 'h3'}
      <h4 class="doc-h3 {compact ? 'doc-h3--compact' : ''}">{@html block.html}</h4>
    {:else if block.kind === 'callout'}
      <aside class="doc-callout {compact ? 'doc-callout--compact' : ''}">{@html block.html}</aside>
    {:else if block.kind === 'ul' || block.kind === 'ol'}
      {@html block.html}
    {:else}
      <p class="{compact ? 'text-xs' : ''}">{@html block.html}</p>
    {/if}
  {/each}
</div>

<style>
  .doc-body--compact {
    font-size: 0.8125rem;
    line-height: 1.55;
  }

  :global(.doc-body strong) { font-weight: 600; color: rgb(39 39 42); }
  :global(.dark .doc-body strong) { color: rgb(244 244 245); }

  :global(.doc-h2) {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgb(24 24 27);
    margin-top: 0.5rem;
  }
  :global(.doc-h2--compact) {
    font-size: 0.9375rem;
    margin-top: 0.25rem;
  }
  :global(.dark .doc-h2) { color: rgb(244 244 245); }

  :global(.doc-h3) {
    font-size: 1.0625rem;
    font-weight: 600;
    color: rgb(63 63 70);
    margin-top: 0.25rem;
  }
  :global(.doc-h3--compact) {
    font-size: 0.875rem;
  }
  :global(.dark .doc-h3) { color: rgb(212 212 216); }

  :global(.doc-callout) {
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    border-left: 3px solid rgb(245 158 11);
    background: rgb(255 251 235 / 0.8);
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  :global(.doc-callout--compact) {
    padding: 0.625rem 0.75rem;
    font-size: 0.75rem;
    border-radius: 0.5rem;
  }
  :global(.dark .doc-callout) {
    background: rgb(69 26 3 / 0.25);
    border-left-color: rgb(251 191 36);
  }

  :global(.doc-list) {
    padding-left: 1.25rem;
    list-style: disc;
  }
  :global(.doc-body--compact .doc-list) {
    font-size: 0.8125rem;
    padding-left: 1.125rem;
  }
  :global(.doc-list li) { margin-top: 0.35rem; }
  :global(ol.doc-list) { list-style: decimal; }

  :global(.doc-checklist) {
    list-style: none;
    padding-left: 0;
  }
  :global(.doc-checklist .doc-check) {
    padding-left: 1.5rem;
    position: relative;
    margin-top: 0.35rem;
  }
  :global(.doc-checklist .doc-check::before) {
    content: '○';
    position: absolute;
    left: 0;
    color: rgb(161 161 170);
    font-size: 0.875rem;
  }
  :global(.doc-checklist .doc-check-done::before) {
    content: '✓';
    color: rgb(16 185 129);
  }

  :global(.doc-inline-code) {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    padding: 0.1em 0.35em;
    border-radius: 0.25rem;
    background: rgb(244 244 245);
    color: rgb(63 63 70);
  }
  :global(.dark .doc-inline-code) {
    background: rgb(39 39 42);
    color: rgb(212 212 216);
  }

  :global(.doc-pre) {
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
    line-height: 1.55;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    overflow-x: auto;
    background: rgb(24 24 27);
    color: rgb(228 228 231);
    border: 1px solid rgb(39 39 42);
  }
  :global(.doc-pre--compact) {
    font-size: 0.6875rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    line-height: 1.45;
  }

  :global(.doc-table) {
    width: 100%;
    font-size: 0.8125rem;
    border-collapse: collapse;
  }
  :global(.doc-body--compact .doc-table) {
    font-size: 0.6875rem;
  }
  :global(.doc-table th),
  :global(.doc-table td) {
    text-align: left;
    padding: 0.5rem 0.625rem;
    border-bottom: 1px solid rgb(228 228 231);
    vertical-align: top;
  }
  :global(.dark .doc-table th),
  :global(.dark .doc-table td) {
    border-bottom-color: rgb(39 39 42);
  }
  :global(.doc-table th) {
    font-weight: 600;
    color: rgb(63 63 70);
    background: rgb(250 250 250);
  }
  :global(.dark .doc-table th) {
    color: rgb(212 212 216);
    background: rgb(39 39 42 / 50);
  }
</style>
