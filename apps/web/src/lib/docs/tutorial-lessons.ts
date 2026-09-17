import { parseAxtest } from '$lib/editor/parse-axtest'
import { TASKFLOW_APP } from './todo-specs'
import { TUTORIAL_SECTIONS, type DocSection } from './content'

export const TASKFLOW_REFERENCE_PROJECT_ID = 3

export interface LessonMeta {
  id: string
  step: number
  title: string
  summary: string
  filePath: string
  mode: 'code' | 'visual'
  checklist: string[]
}

const ADD_TASK_SKELETON = `---
title: Add task
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

RULES
  field "Task title" is required`

const ADD_TASK_WITH_SEED = `---
title: Add task
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

TEST "Add a new task — seed"
  TAG seed
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
    click "Add task"
    type "Buy groceries" in "Task title"
    click "Save"
  ASSERT
    assert "Buy groceries" is_visible
    assert toast shows "Task created"`

const ADD_TASK_SEED_AND_RULES = `---
title: Add task
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

RULES
  field "Task title" is required
  field "Task title" length between 1 and 120
  on empty_title show error "Title is required"
  on invalid_title show error "Title is too long"
  element "Add task" is_enabled

TEST "Add a new task — seed"
  TAG seed
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
    click "Add task"
    type "Buy groceries" in "Task title"
    click "Save"
  ASSERT
    assert "Buy groceries" is_visible
    assert toast shows "Task created"`

const COMPLETE_TASK_SKELETON = `---
title: Complete task
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login`

const FILTER_TASKS_RULES_SKELETON = `---
title: Filter tasks
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

RULES
  url contains "filter=done"`

/** Primary-file content when a lesson practice session starts. */
export const LESSON_STARTER_CONTENT: Record<string, string> = {
  'tutorial-1-create-file': ADD_TASK_SKELETON,
  'tutorial-2-seed-test': ADD_TASK_SKELETON,
  'tutorial-3-rules': ADD_TASK_WITH_SEED,
  'tutorial-4-generate': ADD_TASK_SEED_AND_RULES,
  'tutorial-5-assertions': COMPLETE_TASK_SKELETON,
  'tutorial-6-visual': ADD_TASK_SEED_AND_RULES,
  'tutorial-7-environments': ADD_TASK_SEED_AND_RULES,
  'tutorial-8-organize': FILTER_TASKS_RULES_SKELETON,
}

const LESSON_FILE_PATHS: Record<string, string> = {
  'tutorial-1-create-file': 'modules/todos/add-task.axtest',
  'tutorial-2-seed-test': 'modules/todos/add-task.axtest',
  'tutorial-3-rules': 'modules/todos/add-task.axtest',
  'tutorial-4-generate': 'modules/todos/add-task.axtest',
  'tutorial-5-assertions': 'modules/todos/complete-task.axtest',
  'tutorial-6-visual': 'modules/todos/add-task.axtest',
  'tutorial-7-environments': 'modules/todos/add-task.axtest',
  'tutorial-8-organize': 'modules/todos/filter-tasks.axtest',
}

const LESSON_MODES: Record<string, 'code' | 'visual'> = {
  'tutorial-1-create-file': 'code',
  'tutorial-2-seed-test': 'visual',
  'tutorial-3-rules': 'visual',
  'tutorial-4-generate': 'visual',
  'tutorial-5-assertions': 'visual',
  'tutorial-6-visual': 'visual',
  'tutorial-7-environments': 'visual',
  'tutorial-8-organize': 'visual',
}

const LESSON_CHECKLISTS: Record<string, string[]> = {
  'tutorial-1-create-file': [
    'File has title and base_url in frontmatter',
    'AUTH standard-login is set',
    'At least one RULES line exists',
    'No TEST blocks yet — save the skeleton',
  ],
  'tutorial-2-seed-test': [
    'Add one TEST named for the happy path',
    'Tag the test as seed',
    'Steps: navigate → Add task → type title → Save',
    'Assert task visible and success toast',
  ],
  'tutorial-3-rules': [
    'Expand RULES with length and error messages',
    'Add element state rule for Add task button',
    'Optional: add a note rule for product quirks',
  ],
  'tutorial-4-generate': [
    'Run the seed until it passes',
    'Click Generate on the seed card',
    'Review negative and edge variants',
    'Run the full file from the toolbar',
  ],
  'tutorial-5-assertions': [
    'Open complete-task.axtest in your sandbox',
    'Write a seed for marking a task complete',
    'Use Is visible and URL contains asserts',
  ],
  'tutorial-6-visual': [
    'Switch between File setup and Test cases tabs',
    'Edit a step using verb dropdowns',
    'Use outline filters (Seed / Negative / Edge)',
  ],
  'tutorial-7-environments': [
    'Switch toolbar environment to Local or Staging',
    'Set an override URL if prompted',
    'Run a test and read results in the panel',
  ],
  'tutorial-8-organize': [
    'Build filter-tasks seed in your sandbox',
    'Add the url contains rule when on Completed tab',
    'Run seed → Generate → run full file',
  ],
}

export function getLessonSection(lessonId: string): DocSection | null {
  return TUTORIAL_SECTIONS.find(s => s.id === lessonId) ?? null
}

export function getLessonMeta(lessonId: string): LessonMeta | null {
  const section = TUTORIAL_SECTIONS.find(s => s.id === lessonId)
  if (!section?.step) return null
  return {
    id: lessonId,
    step: section.step,
    title: section.title,
    summary: section.summary,
    filePath: LESSON_FILE_PATHS[lessonId] ?? 'modules/todos/add-task.axtest',
    mode: LESSON_MODES[lessonId] ?? 'visual',
    checklist: LESSON_CHECKLISTS[lessonId] ?? [],
  }
}

export function getLessonStarterContent(lessonId: string): string | null {
  return LESSON_STARTER_CONTENT[lessonId] ?? null
}

export function getLessonFilePath(lessonId: string): string {
  return LESSON_FILE_PATHS[lessonId] ?? 'modules/todos/add-task.axtest'
}

export function getAdjacentLesson(lessonId: string, direction: 'prev' | 'next'): DocSection | null {
  const idx = TUTORIAL_SECTIONS.findIndex(s => s.id === lessonId)
  if (idx < 0) return null
  const nextIdx = direction === 'next' ? idx + 1 : idx - 1
  if (nextIdx < 0 || nextIdx >= TUTORIAL_SECTIONS.length) return null
  return TUTORIAL_SECTIONS[nextIdx]
}

export function isTutorialLessonId(id: string | null | undefined): id is string {
  return !!id && id in LESSON_STARTER_CONTENT
}

export interface CheckpointResult {
  id: string
  label: string
  passed: boolean
}

export function evaluateLessonCheckpoints(lessonId: string, content: string): CheckpointResult[] {
  const parsed = parseAxtest(content)
  const rules = parsed.rules.length
  const tests = parsed.tests
  const seedTests = tests.filter(t => t.kind === 'seed')
  const generated = tests.filter(t => t.generatedFrom)

  switch (lessonId) {
    case 'tutorial-1-create-file':
      return [
        { id: 'fm', label: 'Frontmatter with title', passed: !!parsed.title },
        { id: 'auth', label: 'AUTH block present', passed: !!parsed.auth },
        { id: 'rules', label: 'At least one rule', passed: rules >= 1 },
        { id: 'notests', label: 'No tests yet', passed: tests.length === 0 },
      ]
    case 'tutorial-2-seed-test':
      return [
        { id: 'seed', label: 'One seed test', passed: seedTests.length >= 1 },
        { id: 'steps', label: 'Seed has steps', passed: seedTests.some(t => t.steps.length >= 3) },
        { id: 'asserts', label: 'Seed has assertions', passed: seedTests.some(t => t.asserts.length >= 1) },
      ]
    case 'tutorial-3-rules':
      return [
        { id: 'rules', label: 'Three or more rules', passed: rules >= 3 },
        { id: 'errors', label: 'Error message rules', passed: /show error/.test(content) },
        { id: 'seed', label: 'Seed test still present', passed: seedTests.length >= 1 },
      ]
    case 'tutorial-4-generate':
      return [
        { id: 'seed', label: 'Seed test present', passed: seedTests.length >= 1 },
        { id: 'rules', label: 'Full rules block', passed: rules >= 4 },
        { id: 'generated', label: 'Generated variants exist', passed: generated.length >= 1 },
      ]
    case 'tutorial-5-assertions':
      return [
        { id: 'seed', label: 'Complete-task seed written', passed: seedTests.length >= 1 },
        { id: 'asserts', label: 'Multiple assertion types', passed: tests.some(t => t.asserts.length >= 2) },
      ]
    case 'tutorial-6-visual':
    case 'tutorial-7-environments':
      return [
        { id: 'seed', label: 'Seed test in file', passed: seedTests.length >= 1 },
        { id: 'rules', label: 'Rules configured', passed: rules >= 1 },
      ]
    case 'tutorial-8-organize':
      return [
        { id: 'rules', label: 'Filter rules present', passed: /url contains/.test(content) },
        { id: 'seed', label: 'Filter seed test', passed: seedTests.length >= 1 },
      ]
    default:
      return []
  }
}

export function lessonCheckpointsPassed(lessonId: string, content: string): boolean {
  const results = evaluateLessonCheckpoints(lessonId, content)
  if (results.length === 0) return true
  return results.every(r => r.passed)
}

export function lessonPracticeUrl(lessonId: string, projectId?: number | null): string {
  const meta = getLessonMeta(lessonId)
  const params = new URLSearchParams({ lesson: lessonId })
  if (projectId) params.set('project', String(projectId))
  if (meta?.filePath) params.set('file', meta.filePath)
  if (meta?.mode) params.set('mode', meta.mode)
  return `/editor?${params.toString()}`
}

export function docsLessonUrl(lessonId: string): string {
  return `/docs?lesson=${lessonId}`
}
