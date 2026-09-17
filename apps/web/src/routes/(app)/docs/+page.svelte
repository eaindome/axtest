<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { fade, slide } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import {
    DOC_SECTIONS,
    DOC_GROUPS,
    TUTORIAL_SECTIONS,
    type DocSection,
  } from '$lib/docs/content'
  import { TASKFLOW_APP } from '$lib/docs/todo-specs'
  import { TUTORIAL_EDITOR_LINKS } from '$lib/docs/taskflow-project'
  import { beginLessonPractice } from '$lib/docs/tutorial-practice'
  import { setTutorialActiveLesson } from '$lib/stores/tutorial'
  import DocContentBody from '$lib/components/docs/DocContentBody.svelte'

  let activeId = $state(DOC_SECTIONS[0]?.id ?? 'welcome')
  let expandedGroupId = $state('tutorial')
  let navReady = $state(false)

  const active = $derived(DOC_SECTIONS.find(s => s.id === activeId) ?? DOC_SECTIONS[0])
  const activeGroup = $derived(active?.groupId ?? 'tutorial')

  const tutorialProgress = $derived.by(() => {
    const idx = TUTORIAL_SECTIONS.findIndex(s => s.id === activeId)
    if (idx < 0) return null
    return { current: idx + 1, total: TUTORIAL_SECTIONS.length }
  })

  const continueSection = $derived.by(() => {
    const idx = TUTORIAL_SECTIONS.findIndex(s => s.id === activeId)
    if (idx < 0) return TUTORIAL_SECTIONS[0]
    return TUTORIAL_SECTIONS[Math.min(idx + 1, TUTORIAL_SECTIONS.length - 1)]
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

  const practiceLink = $derived(TUTORIAL_EDITOR_LINKS[activeId])

  onMount(() => {
    navReady = true
    const urlLesson = get(page).url.searchParams.get('lesson')
    const saved = urlLesson ?? localStorage.getItem('docs_active_section')
    if (saved && DOC_SECTIONS.some(s => s.id === saved)) {
      activeId = saved
      expandedGroupId = DOC_SECTIONS.find(s => s.id === saved)?.groupId ?? 'tutorial'
    }
  })

  function goTutorial(step: DocSection) {
    activeId = step.id
    expandedGroupId = 'tutorial'
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

  function practiceActiveLesson() {
    if (!practiceLink) return
    beginLessonPractice(activeId)
    setTutorialActiveLesson(activeId)
    localStorage.setItem('docs_active_section', activeId)
    goto(practiceLink.href)
  }

  function practiceLesson(lessonId: string) {
    const link = TUTORIAL_EDITOR_LINKS[lessonId]
    if (!link) return
    beginLessonPractice(lessonId)
    setTutorialActiveLesson(lessonId)
    activeId = lessonId
    expandedGroupId = 'tutorial'
    localStorage.setItem('docs_active_section', lessonId)
    goto(link.href)
  }

  function setActive(id: string) {
    activeId = id
    const group = DOC_SECTIONS.find(s => s.id === id)?.groupId
    if (group) expandedGroupId = group
    localStorage.setItem('docs_active_section', id)
  }

  function toggleGroup(groupId: string) {
    expandedGroupId = expandedGroupId === groupId ? '' : groupId
  }
</script>

<div class="flex flex-1 min-h-0 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950">
  <nav class="w-64 shrink-0 border-r border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 overflow-y-auto panel-scroll flex flex-col transition-all duration-300 ease-out {navReady ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}">
    <div class="px-4 py-5 border-b border-zinc-100 dark:border-zinc-800">
      <h1 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Knowledge base</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
        Learn axtest with the <strong class="font-medium text-zinc-700 dark:text-zinc-300">TaskFlow Todo</strong> project
      </p>
    </div>

    <div class="flex-1 py-2 px-2 space-y-2">
      {#each DOC_GROUPS as group}
        {@const sections = DOC_SECTIONS.filter(s => s.groupId === group.id)}
        <div class="rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40">
          <button
            type="button"
            onclick={() => toggleGroup(group.id)}
            class="w-full px-3 py-2.5 text-left flex items-center gap-2"
          >
            <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-1">{group.title}</span>
            <span class="text-[11px] text-zinc-400 dark:text-zinc-500">{sections.length}</span>
            <svg class="size-3.5 text-zinc-400 transition-transform {expandedGroupId === group.id ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          {#if group.id === 'tutorial' && expandedGroupId === group.id}
            <div
              in:slide={{ duration: 180, axis: 'y' }}
              out:fade={{ duration: 140 }}
              class="px-3 pb-2.5 border-t border-zinc-100/80 dark:border-zinc-800/80"
            >
              <p class="pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {TASKFLOW_APP.name} · {sections.length} lessons
              </p>
              <div class="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onclick={() => goTutorial(TUTORIAL_SECTIONS[0])}
                  class="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  Start
                </button>
                <button
                  type="button"
                  onclick={() => setActive(continueSection.id)}
                  class="text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          {/if}

          <div class="overflow-hidden transition-[max-height,opacity] duration-250 ease-out {expandedGroupId === group.id ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'}">
            <ul class="px-1.5 pb-1.5 space-y-0.5">
              {#each sections as section}
                <li>
                  <button
                    type="button"
                    onclick={() => setActive(section.id)}
                    class="w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-start gap-2
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
                      {#if expandedGroupId === group.id && activeId === section.id}
                        <span class="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-2">{section.summary}</span>
                      {/if}
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
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
          {#if active.groupId === 'tutorial' && practiceLink}
            <button
              type="button"
              onclick={practiceActiveLesson}
              class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
            >
              {practiceLink.label}
              <span aria-hidden="true">→</span>
            </button>
            {#if practiceLink.hint}
              <p class="text-xs text-zinc-400 mt-1">{practiceLink.hint}</p>
            {/if}
          {/if}
        </header>

        <DocContentBody markdown={active.content} />

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
                onclick={() => {
                  const next = TUTORIAL_SECTIONS[tutorialProgress.current]
                  if (next) practiceLesson(next.id)
                }}
                class="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Practice next lesson →
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
</style>
