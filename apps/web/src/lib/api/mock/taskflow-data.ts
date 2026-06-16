import type { TestFile } from '../types'
import {
  ADD_TASK_SEED_ONLY,
  COMPLETE_TASK_SPEC,
  FILTER_TASKS_SPEC,
  TASKFLOW_APP,
} from '$lib/docs/todo-specs'

/** Mock project id for TaskFlow Todo — keep in sync with mockProjects in data.ts */
export const TASKFLOW_PROJECT_ID = 3

export const TASKFLOW_FILE_IDS = {
  auth: 'tf-auth',
  addTask: 'tf-add-task',
  completeTask: 'tf-complete-task',
  filterTasks: 'tf-filter-tasks',
  smoke: 'tf-smoke',
} as const

export const taskflowFiles: TestFile[] = [
  {
    id: TASKFLOW_FILE_IDS.auth,
    name: 'standard-login.axtest',
    path: 'auth/standard-login.axtest',
    updatedAt: '2025-06-15T10:00:00Z',
    content: `---
title: Standard login
base_url: ${TASKFLOW_APP.productionUrl}
---

TEST "Login to TaskFlow"
  STEPS
    navigate to ${TASKFLOW_APP.loginPath}
    type "demo@taskflow.app" in "Email"
    type "demo1234" in "Password"
    click "Sign in"
  ASSERT
    assert "Task list" is_visible
    assert url contains "/tasks"`,
  },
  {
    id: TASKFLOW_FILE_IDS.addTask,
    name: 'add-task.axtest',
    path: 'modules/todos/add-task.axtest',
    updatedAt: '2025-06-15T10:00:00Z',
    content: ADD_TASK_SEED_ONLY,
  },
  {
    id: TASKFLOW_FILE_IDS.completeTask,
    name: 'complete-task.axtest',
    path: 'modules/todos/complete-task.axtest',
    updatedAt: '2025-06-15T10:00:00Z',
    content: `---
title: Complete task
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

${COMPLETE_TASK_SPEC}`,
  },
  {
    id: TASKFLOW_FILE_IDS.filterTasks,
    name: 'filter-tasks.axtest',
    path: 'modules/todos/filter-tasks.axtest',
    updatedAt: '2025-06-15T10:00:00Z',
    content: `---
title: Filter tasks
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

RULES
  url contains "filter=done"

${FILTER_TASKS_SPEC}`,
  },
  {
    id: TASKFLOW_FILE_IDS.smoke,
    name: 'smoke.axtest',
    path: 'scenarios/smoke.axtest',
    updatedAt: '2025-06-15T10:00:00Z',
    content: `---
title: TaskFlow smoke
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

TEST "Task list loads after login"
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
  ASSERT
    assert "Task list" is_visible
    assert "Add task" is_enabled`,
  },
]
