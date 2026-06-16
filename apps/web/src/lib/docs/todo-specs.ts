/** Canonical TaskFlow Todo examples used throughout the knowledge base. */

export const TASKFLOW_APP = {
  name: 'TaskFlow Todo',
  productionUrl: 'https://todo.taskflow.app',
  stagingUrl: 'https://staging.todo.taskflow.app',
  localUrl: 'http://localhost:5173',
  loginPath: '/login',
  dashboardPath: '/tasks',
} as const

/** Seed-only file — used in mock project so learners can practice Generate. */
export const ADD_TASK_SEED_ONLY = `---
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

export const ADD_TASK_SPEC = `---
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
    assert toast shows "Task created"

TEST "Add task — empty title"
  TAG negative
  GENERATED FROM "Add a new task — seed"
  DEPENDS ON "Add a new task — seed"
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
    click "Add task"
    type "" in "Task title"
    click "Save"
  ASSERT
    assert "Title is required" is_visible

TEST "Add task — very long title"
  TAG edge
  GENERATED FROM "Add a new task — seed"
  DEPENDS ON "Add a new task — seed"
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
    click "Add task"
    type "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" in "Task title"
    click "Save"
  ASSERT
    assert "Title is too long" is_visible`

export const COMPLETE_TASK_SPEC = `TEST "Mark task complete — seed"
  TAG seed
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
    click "Buy groceries"
    click "Mark complete"
  ASSERT
    assert "Buy groceries" is_visible
    assert url contains "/tasks?filter=active"`

export const FILTER_TASKS_SPEC = `TEST "Filter completed tasks — seed"
  TAG seed
  STEPS
    navigate to ${TASKFLOW_APP.dashboardPath}
    click "Completed"
  ASSERT
    assert "Completed" is_visible
    assert url contains "filter=done"`
