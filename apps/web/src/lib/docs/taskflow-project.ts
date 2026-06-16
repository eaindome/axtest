import { TASKFLOW_PROJECT_ID, TASKFLOW_FILE_IDS } from '$lib/api/mock/taskflow-data'

export { TASKFLOW_PROJECT_ID, TASKFLOW_FILE_IDS as TASKFLOW_FILES }

export type EditorDeepLinkOptions = {
  project?: number
  file?: string
  mode?: 'code' | 'visual'
}

/** Build a Test Editor URL with optional project, file, and mode. */
export function editorDeepLink(opts: EditorDeepLinkOptions = {}): string {
  const params = new URLSearchParams()
  const project = opts.project ?? TASKFLOW_PROJECT_ID
  params.set('project', String(project))
  if (opts.file) params.set('file', opts.file)
  if (opts.mode) params.set('mode', opts.mode)
  return `/editor?${params.toString()}`
}

/** Per-lesson editor links for the TaskFlow tutorial track. */
export const TUTORIAL_EDITOR_LINKS: Record<
  string,
  { href: string; label: string; hint?: string }
> = {
  'tutorial-1-create-file': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.addTask, mode: 'visual' }),
    label: 'Open add-task.axtest',
    hint: 'File setup tab — matches Lesson 1',
  },
  'tutorial-2-seed-test': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.addTask, mode: 'visual' }),
    label: 'Open seed test in Visual editor',
    hint: 'Run the seed from the test card',
  },
  'tutorial-3-rules': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.addTask, mode: 'visual' }),
    label: 'Edit rules in File setup',
  },
  'tutorial-4-generate': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.addTask, mode: 'visual' }),
    label: 'Generate from this seed',
    hint: 'Run seed first, then click Generate',
  },
  'tutorial-5-assertions': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.completeTask, mode: 'visual' }),
    label: 'Open complete-task.axtest',
  },
  'tutorial-6-visual': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.addTask, mode: 'visual' }),
    label: 'Explore Visual editor',
  },
  'tutorial-7-environments': {
    href: editorDeepLink({ project: TASKFLOW_PROJECT_ID }),
    label: 'Open editor — set staging URL',
  },
  'tutorial-8-organize': {
    href: editorDeepLink({ file: TASKFLOW_FILE_IDS.filterTasks, mode: 'visual' }),
    label: 'Open filter-tasks.axtest',
    hint: 'Graduation exercise file',
  },
}
