<script lang="ts">
  import { goto } from '$app/navigation'
  import DocContentBody from '$lib/components/docs/DocContentBody.svelte'
  import {
    getLessonMeta,
    getLessonSection,
    getAdjacentLesson,
    evaluateLessonCheckpoints,
    lessonCheckpointsPassed,
    docsLessonUrl,
    lessonPracticeUrl,
  } from '$lib/docs/tutorial-lessons'
  import { LESSON_COACH_INTRO } from '$lib/docs/render-doc-content'
  import { TUTORIAL_SECTIONS } from '$lib/docs/content'
  import { markTutorialLessonComplete, setTutorialActiveLesson } from '$lib/stores/tutorial'

  interface Props {
    lessonId: string
    fileContent: string
    sandboxProjectId: number
    resetting?: boolean
    onReset: () => void | Promise<void>
  }

  let { lessonId, fileContent, sandboxProjectId, resetting = false, onReset }: Props = $props()

  const meta = $derived(getLessonMeta(lessonId))
  const section = $derived(getLessonSection(lessonId))
  const checkpoints = $derived(evaluateLessonCheckpoints(lessonId, fileContent))
  const allPassed = $derived(lessonCheckpointsPassed(lessonId, fileContent))
  const prevLesson = $derived(getAdjacentLesson(lessonId, 'prev'))
  const nextLesson = $derived(getAdjacentLesson(lessonId, 'next'))
  const progressPct = $derived(
    meta ? (meta.step / TUTORIAL_SECTIONS.length) * 100 : 0,
  )

  function openFullLesson() {
    goto(docsLessonUrl(lessonId))
  }

  async function goNext() {
    if (allPassed) markTutorialLessonComplete(lessonId)
    if (!nextLesson) {
      goto('/docs?lesson=cheat-sheet')
      return
    }
    setTutorialActiveLesson(nextLesson.id)
    goto(lessonPracticeUrl(nextLesson.id, sandboxProjectId))
  }

  function goPrev() {
    if (!prevLesson) return
    setTutorialActiveLesson(prevLesson.id)
    goto(lessonPracticeUrl(prevLesson.id, sandboxProjectId))
  }
</script>

<aside class="shrink-0 flex flex-col h-full bg-zinc-50/90 dark:bg-zinc-900/90 border-l border-zinc-200/80 dark:border-zinc-800 w-[22rem] max-w-[40vw]">
  <div class="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
      Lesson coach
    </p>
    {#if meta}
      <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 leading-snug">
        {meta.title}
      </h2>
      <div class="mt-2.5 flex items-center gap-2">
        <div class="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            class="h-full bg-amber-500 rounded-full transition-all duration-300"
            style="width: {progressPct}%"
          ></div>
        </div>
        <span class="text-[10px] font-medium text-zinc-500 tabular-nums shrink-0">
          {meta.step}/{TUTORIAL_SECTIONS.length}
        </span>
      </div>
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto coach-scroll">
    <div class="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/80">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
        Follow along
      </p>
      <p class="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/25 px-2.5 py-2 mb-3">
        {LESSON_COACH_INTRO}
      </p>
      {#if section}
        <DocContentBody markdown={section.content} compact />
      {/if}
    </div>

    <div class="px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
        Your progress
      </p>
      <ul class="space-y-2">
        {#each checkpoints as item}
          <li class="flex items-start gap-2 text-xs">
            <span
              class="mt-0.5 size-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
                     {item.passed
                       ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                       : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}"
            >
              {item.passed ? '✓' : '○'}
            </span>
            <span class="{item.passed ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}">
              {item.label}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="p-3 border-t border-zinc-200/80 dark:border-zinc-800 space-y-2 shrink-0">
    <button
      type="button"
      onclick={openFullLesson}
      class="w-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 py-1 transition-colors text-left"
    >
      Wider view in Knowledge base →
    </button>

    <button
      type="button"
      onclick={() => onReset()}
      disabled={resetting}
      class="w-full px-3 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700
             text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
             disabled:opacity-50"
    >
      {resetting ? 'Resetting…' : 'Reset file to lesson start'}
    </button>

    <div class="flex gap-2">
      <button
        type="button"
        onclick={goPrev}
        disabled={!prevLesson}
        class="flex-1 px-2 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800
               disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>
      <button
        type="button"
        onclick={goNext}
        class="flex-1 px-2 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
      >
        {nextLesson ? 'Next lesson →' : 'Finish →'}
      </button>
    </div>
  </div>
</aside>

<style>
  .coach-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .coach-scroll::-webkit-scrollbar { width: 4px; }
  .coach-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }
</style>
