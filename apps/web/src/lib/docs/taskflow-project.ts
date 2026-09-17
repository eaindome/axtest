import { TASKFLOW_PROJECT_ID, TASKFLOW_FILE_IDS } from '$lib/api/mock/taskflow-data'
import { lessonPracticeUrl } from './tutorial-lessons'

export { TASKFLOW_PROJECT_ID, TASKFLOW_FILE_IDS as TASKFLOW_FILES }

export type EditorDeepLinkOptions = {
  project?: number
  file?: string
  mode?: 'code' | 'visual'
  lesson?: string
}

/** Build a Test Editor URL with optional project, file, mode, and lesson. */
export function editorDeepLink(opts: EditorDeepLinkOptions = {}): string {
  if (opts.lesson) {
    return lessonPracticeUrl(opts.lesson, opts.project)
  }
  const params = new URLSearchParams()
  const project = opts.project ?? TASKFLOW_PROJECT_ID
  params.set('project', String(project))
  if (opts.file) params.set('file', opts.file)
  if (opts.mode) params.set('mode', opts.mode)
  return `/editor?${params.toString()}`
}

/** Per-lesson practice links — opens sandbox via lesson param. */
export const TUTORIAL_EDITOR_LINKS: Record<
  string,
  { href: string; label: string; hint?: string }
> = {
  'tutorial-1-create-file': {
    href: editorDeepLink({ lesson: 'tutorial-1-create-file', file: 'modules/todos/add-task.axtest', mode: 'code' }),
    label: 'Practice — create add-task.axtest',
    hint: 'Starts in your sandbox with an empty skeleton',
  },
  'tutorial-2-seed-test': {
    href: editorDeepLink({ lesson: 'tutorial-2-seed-test', file: 'modules/todos/add-task.axtest', mode: 'visual' }),
    label: 'Practice — write the seed test',
    hint: 'Run the seed from the test card',
  },
  'tutorial-3-rules': {
    href: editorDeepLink({ lesson: 'tutorial-3-rules', file: 'modules/todos/add-task.axtest', mode: 'visual' }),
    label: 'Practice — add validation rules',
  },
  'tutorial-4-generate': {
    href: editorDeepLink({ lesson: 'tutorial-4-generate', file: 'modules/todos/add-task.axtest', mode: 'visual' }),
    label: 'Practice — generate variants',
    hint: 'Run seed first, then click Generate',
  },
  'tutorial-5-assertions': {
    href: editorDeepLink({ lesson: 'tutorial-5-assertions', file: 'modules/todos/complete-task.axtest', mode: 'visual' }),
    label: 'Practice — complete-task assertions',
  },
  'tutorial-6-visual': {
    href: editorDeepLink({ lesson: 'tutorial-6-visual', file: 'modules/todos/add-task.axtest', mode: 'visual' }),
    label: 'Practice — explore Visual editor',
  },
  'tutorial-7-environments': {
    href: editorDeepLink({ lesson: 'tutorial-7-environments', file: 'modules/todos/add-task.axtest', mode: 'visual' }),
    label: 'Practice — set staging URL',
  },
  'tutorial-8-organize': {
    href: editorDeepLink({ lesson: 'tutorial-8-organize', file: 'modules/todos/filter-tasks.axtest', mode: 'visual' }),
    label: 'Practice — filter-tasks exercise',
    hint: 'Graduation exercise file',
  },
}
