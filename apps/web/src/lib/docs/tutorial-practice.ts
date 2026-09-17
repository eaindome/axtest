import { get } from 'svelte/store'
import { api } from '$lib/api'
import { currentWorkspace } from '$lib/stores/workspace'
import {
  setTutorialSandboxProjectId,
  clearTutorialSandboxProjectId,
  setTutorialActiveLesson,
  tutorialSandboxProjectId,
} from '$lib/stores/tutorial'
import {
  getLessonStarterContent,
  getLessonFilePath,
  isTutorialLessonId,
} from '$lib/docs/tutorial-lessons'

/** Ensure the learner has a personal sandbox project; fork on first lesson. */
export async function ensureTutorialSandbox(): Promise<number> {
  const existing = get(tutorialSandboxProjectId)
  if (existing) {
    try {
      const explorer = await api().getExplorer(existing)
      if (explorer.files.length > 0) return existing
    } catch {
      // stale id — fork below
    }
    clearTutorialSandboxProjectId()
  }

  const ws = get(currentWorkspace)
  if (!ws) throw new Error('No workspace selected')

  const { project } = await api().forkTutorialSandbox(ws.id)
  setTutorialSandboxProjectId(project.id)
  return project.id
}

export async function applyLessonStarter(
  projectId: number,
  lessonId: string,
): Promise<void> {
  if (!isTutorialLessonId(lessonId)) return
  await api().resetLessonFile(projectId, { lessonId })
}

export function beginLessonPractice(lessonId: string) {
  if (!isTutorialLessonId(lessonId)) return
  setTutorialActiveLesson(lessonId)
}

export function lessonFilePath(lessonId: string): string {
  return getLessonFilePath(lessonId)
}

export function lessonStarterPreview(lessonId: string): string | null {
  return getLessonStarterContent(lessonId)
}
