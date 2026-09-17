import { browser } from '$app/environment'
import { derived, writable, get } from 'svelte/store'
import {
  getLessonMeta,
  isTutorialLessonId,
  lessonPracticeUrl,
} from '$lib/docs/tutorial-lessons'
import { TUTORIAL_SECTIONS, type DocSection } from '$lib/docs/content'

const KEYS = {
  sandboxProjectId: 'axtest_tutorial_sandbox_id',
  activeLesson: 'axtest_tutorial_active_lesson',
  completed: 'axtest_tutorial_completed',
  docsSection: 'docs_active_section',
} as const

function readJson<T>(key: string, fallback: T): T {
  if (!browser) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (!browser) return
  localStorage.setItem(key, JSON.stringify(value))
}

export const tutorialSandboxProjectId = writable<number | null>(
  browser
    ? (() => {
        const raw = localStorage.getItem(KEYS.sandboxProjectId)
        return raw ? Number(raw) : null
      })()
    : null,
)

export const tutorialActiveLessonId = writable<string | null>(
  browser ? localStorage.getItem(KEYS.activeLesson) : null,
)

export const tutorialCompletedLessonIds = writable<string[]>(
  readJson<string[]>(KEYS.completed, []),
)

tutorialSandboxProjectId.subscribe(id => {
  if (!browser) return
  if (id) localStorage.setItem(KEYS.sandboxProjectId, String(id))
  else localStorage.removeItem(KEYS.sandboxProjectId)
})

tutorialActiveLessonId.subscribe(id => {
  if (!browser) return
  if (id) {
    localStorage.setItem(KEYS.activeLesson, id)
    localStorage.setItem(KEYS.docsSection, id)
  } else {
    localStorage.removeItem(KEYS.activeLesson)
  }
})

tutorialCompletedLessonIds.subscribe(ids => {
  writeJson(KEYS.completed, ids)
})

export function setTutorialSandboxProjectId(id: number) {
  tutorialSandboxProjectId.set(id)
}

export function clearTutorialSandboxProjectId() {
  tutorialSandboxProjectId.set(null)
}

export function setTutorialActiveLesson(lessonId: string | null) {
  if (lessonId && !isTutorialLessonId(lessonId)) return
  tutorialActiveLessonId.set(lessonId)
  if (lessonId && browser) {
    localStorage.setItem(KEYS.docsSection, lessonId)
  }
}

export function markTutorialLessonComplete(lessonId: string) {
  tutorialCompletedLessonIds.update(ids => {
    if (ids.includes(lessonId)) return ids
    return [...ids, lessonId]
  })
}

export function isTutorialLessonComplete(lessonId: string): boolean {
  return get(tutorialCompletedLessonIds).includes(lessonId)
}

export const tutorialContinueLesson = derived(
  [tutorialActiveLessonId, tutorialSandboxProjectId],
  ([lessonId, sandboxId]) => {
    if (!lessonId || !isTutorialLessonId(lessonId)) return null
    const meta = getLessonMeta(lessonId)
    if (!meta) return null
    return {
      lessonId,
      step: meta.step,
      title: meta.title,
      href: lessonPracticeUrl(lessonId, sandboxId),
    }
  },
)

export function getSavedDocsSection(): string | null {
  if (!browser) return null
  return localStorage.getItem(KEYS.docsSection)
}

export function resolveTutorialLessonFromUrl(
  lessonParam: string | null,
): DocSection | null {
  if (!lessonParam) return null
  return TUTORIAL_SECTIONS.find(s => s.id === lessonParam) ?? null
}
