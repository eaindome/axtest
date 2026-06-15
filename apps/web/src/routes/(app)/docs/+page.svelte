<script lang="ts">
  import { DOC_SECTIONS } from '$lib/docs/content'

  let activeId = $state(DOC_SECTIONS[0]?.id ?? 'getting-started')

  const active = $derived(DOC_SECTIONS.find(s => s.id === activeId) ?? DOC_SECTIONS[0])

  function renderInline(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
  }

  function renderBlock(block: string): { kind: 'p' | 'pre' | 'table'; html: string }[] {
    const parts: { kind: 'p' | 'pre' | 'table'; html: string }[] = []
    const chunks = block.split(/\n\n+/)
    for (const chunk of chunks) {
      const t = chunk.trim()
      if (!t) continue
      if (t.startsWith('```')) {
        const code = t.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
        parts.push({ kind: 'pre', html: code })
      } else if (t.startsWith('|')) {
        parts.push({ kind: 'table', html: t })
      } else {
        parts.push({ kind: 'p', html: renderInline(t.replace(/\n/g, '<br/>')) })
      }
    }
    return parts
  }

  const blocks = $derived(active ? renderBlock(active.content) : [])

  function renderTable(md: string): string {
    const rows = md.split('\n').filter(r => r.trim().startsWith('|'))
    if (rows.length < 2) return md
    const parseRow = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())
    const header = parseRow(rows[0])
    const body = rows.slice(2).map(parseRow)
    let html = '<table class="doc-table"><thead><tr>'
    for (const h of header) html += `<th>${renderInline(h)}</th>`
    html += '</tr></thead><tbody>'
    for (const row of body) {
      html += '<tr>'
      for (const cell of row) html += `<td>${renderInline(cell)}</td>`
      html += '</tr>'
    }
    html += '</tbody></table>'
    return html
  }
</script>

<div class="flex flex-1 min-h-0 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950">
  <nav class="w-56 shrink-0 border-r border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 overflow-y-auto panel-scroll">
    <div class="px-4 py-5 border-b border-zinc-100 dark:border-zinc-800">
      <h1 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Knowledge base</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Learn axtest syntax and workflows</p>
    </div>
    <ul class="py-2 px-2 space-y-0.5">
      {#each DOC_SECTIONS as section}
        <li>
          <button
            type="button"
            onclick={() => (activeId = section.id)}
            class="w-full text-left px-3 py-2.5 rounded-lg transition-colors
                   {activeId === section.id
                     ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
                     : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
          >
            <span class="text-sm font-medium block">{section.title}</span>
            <span class="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-2">{section.summary}</span>
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <article class="flex-1 overflow-y-auto panel-scroll">
    <div class="max-w-3xl mx-auto px-8 py-8">
      {#if active}
        <header class="mb-8 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
          <p class="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Documentation</p>
          <h2 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{active.title}</h2>
          <p class="text-base text-zinc-500 dark:text-zinc-400 mt-2">{active.summary}</p>
        </header>

        <div class="doc-body space-y-5 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          {#each blocks as block}
            {#if block.kind === 'pre'}
              <pre class="doc-pre"><code>{block.html}</code></pre>
            {:else if block.kind === 'table'}
              {@html renderTable(block.html)}
            {:else}
              <p>{@html block.html}</p>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </article>
</div>

<style>
  .panel-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .panel-scroll::-webkit-scrollbar { width: 5px; }
  .panel-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }

  :global(.doc-body strong) { font-weight: 600; color: rgb(39 39 42); }
  :global(.dark .doc-body strong) { color: rgb(244 244 245); }
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
    font-size: 0.875rem;
    line-height: 1.6;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    overflow-x: auto;
    background: rgb(24 24 27);
    color: rgb(228 228 231);
    border: 1px solid rgb(39 39 42);
  }
  :global(.doc-table) {
    width: 100%;
    font-size: 0.9375rem;
    border-collapse: collapse;
  }
  :global(.doc-table th),
  :global(.doc-table td) {
    text-align: left;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid rgb(228 228 231);
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
