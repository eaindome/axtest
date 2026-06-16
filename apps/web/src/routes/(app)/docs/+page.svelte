<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    DOC_SECTIONS,
    DOC_GROUPS,
    TUTORIAL_SECTIONS,
    type DocSection,
  } from '$lib/docs/content'
  import { TASKFLOW_APP } from '$lib/docs/todo-specs'

  let activeId = $state(DOC_SECTIONS[0]?.id ?? 'welcome')

  const active = $derived(DOC_SECTIONS.find(s => s.id === activeId) ?? DOC_SECTIONS[0])

  const tutorialProgress = $derived.by(() => {
    const idx = TUTORIAL_SECTIONS.findIndex(s => s.id === activeId)
    if (idx < 0) return null
    return { current: idx + 1, total: TUTORIAL_SECTIONS.length }
  })
  const TUTORIAL_FILE_BY_SECTION: Record<string, string> = {
    'tutorial-1-create-file': 'modules/todos/add-task.axtest',
    'tutorial-2-seed-test': 'modules/todos/add-task.axtest',
    'tutorial-3-rules': 'modules/todos/add-task.axtest',
    'tutorial-4-generate': 'modules/todos/add-task.axtest',
    'tutorial-5-assertions': 'modules/todos/complete-task.axtest',
    'tutorial-6-visual': 'modules/todos/add-task.axtest',
    'tutorial-7-environments': 'modules/todos/add-task.axtest',
    'tutorial-8-organize': 'modules/todos/filter-tasks.axtest',
  }

  function renderInline(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
  }

  type BlockKind = 'p' | 'pre' | 'table' | 'h2' | 'h3' | 'callout' | 'ul' | 'ol'

  interface ContentBlock {
    kind: BlockKind
    html: string
  }

  function parseList(lines: string[], ordered: boolean): ContentBlock {
    const items = lines.map(l =>
      ordered ? l.replace(/^\d+\.\s+/, '') : l.replace(/^[-*]\s+/, ''),
    )
    const tag = ordered ? 'ol' : 'ul'
    const inner = items.map(i => `<li>${renderInline(i)}</li>`).join('')
    return { kind: ordered ? 'ol' : 'ul', html: `<${tag} class="doc-list">${inner}</${tag}>` }
  }

  function renderBlock(block: string): ContentBlock[] {
    const parts: ContentBlock[] = []
    const chunks = block.split(/\n\n+/)
    for (const chunk of chunks) {
      const t = chunk.trim()
      if (!t) continue

      if (t.startsWith('```')) {
        const code = t.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
        parts.push({ kind: 'pre', html: code })
        continue
      }

      if (t.startsWith('## ')) {
        parts.push({ kind: 'h2', html: renderInline(t.slice(3)) })
        continue
      }

      if (t.startsWith('### ')) {
        parts.push({ kind: 'h3', html: renderInline(t.slice(4)) })
        continue
      }

      if (t.startsWith('> ')) {
        const body = t.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ')
        parts.push({ kind: 'callout', html: renderInline(body) })
        continue
      }

      if (t.startsWith('|')) {
        parts.push({ kind: 'table', html: t })
        continue
      }

      const lines = t.split('\n')
      if (lines.every(l => /^[-*]\s+/.test(l.trim()) || l.trim() === '')) {
        parts.push(parseList(lines.filter(l => l.trim()), false))
        continue
      }

      if (lines.every(l => /^\d+\.\s+/.test(l.trim()) || l.trim() === '')) {
        parts.push(parseList(lines.filter(l => l.trim()), true))
        continue
      }

      // Checkbox lists: - [ ] or - [x]
      if (lines.every(l => /^-\s+\[[ x]\]/.test(l.trim()))) {
        const inner = lines.map(l => {
          const checked = l.includes('[x]')
          const label = l.replace(/^-\s+\[[ x]\]\s*/, '')
          return `<li class="doc-check ${checked ? 'doc-check-done' : ''}">${renderInline(label)}</li>`
        }).join('')
        parts.push({ kind: 'ul', html: `<ul class="doc-checklist">${inner}</ul>` })
        continue
      }

      parts.push({ kind: 'p', html: renderInline(t.replace(/\n/g, '<br/>')) })
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

  function goTutorial(step: DocSection) {
    activeId = step.id
  }

  function nextTutorial() {
    const idx = TUTORIAL_SECTIONS.findIndex(s => s.id === activeId)
    if (idx >= 0 && idx < TUTORIAL_SECTIONS.length - 1) {
      activeId = TUTORIAL_SECTIONS[idx + 1].id
    }
  }

  function prevTutorial() {
    const idx = TUTORIAL_SECTIONS.findIndex(s => s.id === activeId)
    if (idx > 0) activeId = TUTORIAL_SECTIONS[idx - 1].id
  }

  function openEditor(projectId = 3, filePath?: string) {
    const params = new URLSearchParams({ project: String(projectId) })
    if (filePath) params.set('file', filePath)
    goto(`/editor?${params.toString()}`)
  }

  function openEditorForActiveSection() {
    const filePath = TUTORIAL_FILE_BY_SECTION[activeId] ?? 'modules/todos/add-task.axtest'
    openEditor(3, filePath)
  }
</script>

<div class="flex flex-1 min-h-0 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950">
  <nav class="w-60 shrink-0 border-r border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 overflow-y-auto panel-scroll flex flex-col">
    <div class="px-4 py-5 border-b border-zinc-100 dark:border-zinc-800">
      <h1 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Knowledge base</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
        Learn axtest with the <strong class="font-medium text-zinc-700 dark:text-zinc-300">TaskFlow Todo</strong> project
      </p>
    </div>

    <div class="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-zinc-900/50">
      <p class="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">Training app</p>
      <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{TASKFLOW_APP.name}</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono truncate">{TASKFLOW_APP.productionUrl}</p>
      <button
        type="button"
        onclick={() => goTutorial(TUTORIAL_SECTIONS[0])}
        class="mt-3 w-full text-xs font-semibold py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
      >
        Start tutorial →
      </button>
      <button
        type="button"
        onclick={() => openEditor(3, 'modules/todos/add-task.axtest')}
        class="mt-2 w-full text-xs font-semibold py-2 px-3 rounded-lg bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
      >
        Open TaskFlow in editor
      </button>
    </div>

    <div class="flex-1 py-2 px-2 space-y-4">
      {#each DOC_GROUPS as group}
        {@const sections = DOC_SECTIONS.filter(s => s.groupId === group.id)}
        <div>
          <p class="px-2 pb-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            {group.title}
          </p>
          <ul class="space-y-0.5">
            {#each sections as section}
              <li>
                <button
                  type="button"
                  onclick={() => (activeId = section.id)}
                  class="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-2
                         {activeId === section.id
                           ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
                           : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
                >
                  {#if section.step}
                    <span class="shrink-0 size-5 rounded-md bg-zinc-200/80 dark:bg-zinc-700 text-xs font-bold flex items-center justify-center
                                 {activeId === section.id ? 'bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100' : 'text-zinc-500'}">
                      {section.step}
                    </span>
                  {/if}
                  <span class="min-w-0">
                    <span class="text-sm font-medium block leading-snug">{section.title}</span>
                    <span class="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-2">{section.summary}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </nav>

  <article class="flex-1 overflow-y-auto panel-scroll">
    <div class="max-w-3xl mx-auto px-8 py-8">
      {#if active}
        {#if tutorialProgress}
          <div class="mb-6 flex items-center gap-3">
            <div class="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                class="h-full bg-amber-500 rounded-full transition-all duration-300"
                style="width: {(tutorialProgress.current / tutorialProgress.total) * 100}%"
              ></div>
            </div>
            <span class="text-xs font-medium text-zinc-500 tabular-nums shrink-0">
              Step {tutorialProgress.current} / {tutorialProgress.total}
            </span>
          </div>
        {/if}

        <header class="mb-8 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
          <p class="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
            {DOC_GROUPS.find(g => g.id === active.groupId)?.title ?? 'Documentation'}
            {#if active.step} · Lesson {active.step}{/if}
          </p>
          <h2 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{active.title}</h2>
          <p class="text-base text-zinc-500 dark:text-zinc-400 mt-2">{active.summary}</p>
          {#if active.groupId === 'tutorial'}
            <button
              type="button"
              onclick={openEditorForActiveSection}
              class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
            >
              Open this lesson in Test Editor
              <span aria-hidden="true">→</span>
            </button>
          {/if}
        </header>

        <div class="doc-body space-y-5 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          {#each blocks as block}
            {#if block.kind === 'pre'}
              <pre class="doc-pre"><code>{block.html}</code></pre>
            {:else if block.kind === 'table'}
              {@html renderTable(block.html)}
            {:else if block.kind === 'h2'}
              <h3 class="doc-h2">{@html block.html}</h3>
            {:else if block.kind === 'h3'}
              <h4 class="doc-h3">{@html block.html}</h4>
            {:else if block.kind === 'callout'}
              <aside class="doc-callout">{@html block.html}</aside>
            {:else if block.kind === 'ul' || block.kind === 'ol'}
              {@html block.html}
            {:else}
              <p>{@html block.html}</p>
            {/if}
          {/each}
        </div>

        {#if tutorialProgress}
          <footer class="mt-10 pt-6 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4">
            <button
              type="button"
              onclick={prevTutorial}
              disabled={tutorialProgress.current === 1}
              class="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous lesson
            </button>
            {#if tutorialProgress.current < tutorialProgress.total}
              <button
                type="button"
                onclick={nextTutorial}
                class="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Next lesson →
              </button>
            {:else}
              <button
                type="button"
                onclick={() => (activeId = 'cheat-sheet')}
                class="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                Open cheat sheet →
              </button>
            {/if}
          </footer>
        {/if}
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

  :global(.doc-h2) {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgb(24 24 27);
    margin-top: 0.5rem;
  }
  :global(.dark .doc-h2) { color: rgb(244 244 245); }

  :global(.doc-h3) {
    font-size: 1.0625rem;
    font-weight: 600;
    color: rgb(63 63 70);
    margin-top: 0.25rem;
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
  :global(.dark .doc-callout) {
    background: rgb(69 26 3 / 0.25);
    border-left-color: rgb(251 191 36);
  }

  :global(.doc-list) {
    padding-left: 1.25rem;
    list-style: disc;
    space-y: 0.25rem;
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
