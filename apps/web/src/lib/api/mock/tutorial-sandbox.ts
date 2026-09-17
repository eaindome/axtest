import type { Project, TestFile } from '../types'
import { mockTaskflowFiles } from './data'
import { getLessonFilePath, getLessonStarterContent } from '$lib/docs/tutorial-lessons'
import { initSandboxFileStore, isSandboxProject, setSandboxFiles } from './files'

const SANDBOX_PROJECT_NAME = 'TaskFlow Tutorial (Sandbox)'

let nextSandboxId = 100
const sandboxProjects = new Map<number, Project>()

function cloneAuthFile(): TestFile {
  const ref = mockTaskflowFiles.find(f => f.path === 'auth/standard-login.axtest')!
  return {
    ...ref,
    id: `sb-auth-${nextSandboxId}`,
    updatedAt: new Date().toISOString(),
  }
}

/** Initial sandbox tree — reference auth, lesson-1 starters elsewhere. */
export function buildInitialSandboxFiles(): TestFile[] {
  const id = nextSandboxId
  const lesson1 = getLessonStarterContent('tutorial-1-create-file')!
  return [
    cloneAuthFile(),
    {
      id: `sb-add-${id}`,
      name: 'add-task.axtest',
      path: 'modules/todos/add-task.axtest',
      updatedAt: new Date().toISOString(),
      content: lesson1,
    },
    {
      id: `sb-complete-${id}`,
      name: 'complete-task.axtest',
      path: 'modules/todos/complete-task.axtest',
      updatedAt: new Date().toISOString(),
      content: getLessonStarterContent('tutorial-5-assertions')!,
    },
    {
      id: `sb-filter-${id}`,
      name: 'filter-tasks.axtest',
      path: 'modules/todos/filter-tasks.axtest',
      updatedAt: new Date().toISOString(),
      content: `---
title: Filter tasks
base_url: https://todo.taskflow.app
---

AUTH standard-login`,
    },
  ]
}

export function getSandboxProjects(): Project[] {
  return [...sandboxProjects.values()]
}

export function getSandboxProject(projectId: number): Project | undefined {
  return sandboxProjects.get(projectId)
}

export function forkTutorialSandboxProject(): Project {
  const existing = [...sandboxProjects.values()][0]
  if (existing) return existing

  const project: Project = {
    id: nextSandboxId++,
    name: SANDBOX_PROJECT_NAME,
    baseUrl: 'https://todo.taskflow.app',
    description: 'Your personal practice copy — edit freely. The reference TaskFlow project stays untouched.',
    runCount: 0,
    systemCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  sandboxProjects.set(project.id, project)
  const files = buildInitialSandboxFiles()
  setSandboxFiles(project.id, files)
  return project
}

export function resetLessonStarter(projectId: number, lessonId: string): TestFile {
  if (!isSandboxProject(projectId)) {
    throw new Error('Lesson reset is only available in your tutorial sandbox')
  }

  const starter = getLessonStarterContent(lessonId)
  const filePath = getLessonFilePath(lessonId)
  if (!starter) throw new Error('Unknown lesson')

  initSandboxFileStore(projectId)
  const files = setSandboxFiles(projectId, undefined, (current) => {
    const idx = current.findIndex(f => f.path === filePath)
    if (idx < 0) throw new Error('Lesson file not found in sandbox')
    const updated: TestFile = {
      ...current[idx],
      content: starter,
      updatedAt: new Date().toISOString(),
    }
    const next = [...current]
    next[idx] = updated
    return next
  })

  return files.find(f => f.path === filePath)!
}
