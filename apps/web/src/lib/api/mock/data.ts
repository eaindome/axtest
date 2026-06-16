import type { User, Workspace, Project, RunListItem, RunDetail, TestFile } from '../types'

export const mockUser: User = {
  id: 1,
  name: 'Ekow Indome',
  email: 'ekow@ssmas.com'
}

export const mockToken = 'mock_jwt_token_dev_only'

export const mockWorkspaces: Workspace[] = [
  {
    id: 1,
    name: 'SSMAS',
    memberCount: 3,
    projectCount: 3,
    createdAt: '2025-01-10T08:00:00Z'
  }
]

export const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Students Portal',
    baseUrl: 'https://portal.ssmas.com',
    description: 'Student-facing portal for finance, discounts, and repayments',
    runCount: 24,
    systemCount: 5,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-06-10T14:30:00Z'
  },
  {
    id: 2,
    name: 'Admin Dashboard',
    baseUrl: 'https://admin.ssmas.com',
    description: 'Internal admin panel for budget management and reporting',
    runCount: 12,
    systemCount: 3,
    createdAt: '2025-02-01T09:00:00Z',
    updatedAt: '2025-06-08T11:00:00Z'
  },
  {
    id: 3,
    name: 'TaskFlow Todo',
    baseUrl: 'https://todo.taskflow.app',
    description: 'Training todo app used in the knowledge base walkthrough',
    runCount: 6,
    systemCount: 3,
    createdAt: '2025-04-04T08:30:00Z',
    updatedAt: '2026-06-16T07:00:00Z'
  }
]

export const mockRuns: RunListItem[] = [
  {
    id: 1,
    status: 'passed',
    environment: 'staging',
    totalTests: 38,
    passedTests: 38,
    failedTests: 0,
    durationMs: 27450,
    suiteName: 'Full Regression',
    triggeredBy: 'ekow@ssmas.com',
    startedAt: '2025-06-15T09:00:00Z',
    completedAt: '2025-06-15T09:00:27Z'
  },
  {
    id: 2,
    status: 'failed',
    environment: 'staging',
    totalTests: 38,
    passedTests: 35,
    failedTests: 3,
    durationMs: 31200,
    suiteName: 'Full Regression',
    triggeredBy: 'ci/github-actions',
    startedAt: '2025-06-14T14:00:00Z',
    completedAt: '2025-06-14T14:00:31Z'
  },
  {
    id: 3,
    status: 'passed',
    environment: 'production',
    totalTests: 12,
    passedTests: 12,
    failedTests: 0,
    durationMs: 8900,
    suiteName: 'Module 05 — Budget Creation',
    triggeredBy: 'ekow@ssmas.com',
    startedAt: '2025-06-13T16:30:00Z',
    completedAt: '2025-06-13T16:30:09Z'
  },
  {
    id: 4,
    status: 'failed',
    environment: 'staging',
    totalTests: 8,
    passedTests: 5,
    failedTests: 3,
    durationMs: 12400,
    suiteName: 'Module 31 — Student Discounts',
    triggeredBy: 'ekow@ssmas.com',
    startedAt: '2025-06-12T10:00:00Z',
    completedAt: '2025-06-12T10:00:12Z'
  },
  {
    id: 5,
    status: 'passed',
    environment: 'staging',
    totalTests: 38,
    passedTests: 37,
    failedTests: 1,
    durationMs: 29100,
    suiteName: 'Full Regression',
    triggeredBy: 'ci/github-actions',
    startedAt: '2025-06-11T09:00:00Z',
    completedAt: '2025-06-11T09:00:29Z'
  },
  {
    id: 6,
    status: 'passed',
    environment: 'production',
    totalTests: 38,
    passedTests: 38,
    failedTests: 0,
    durationMs: 26800,
    suiteName: 'Full Regression',
    triggeredBy: 'ekow@ssmas.com',
    startedAt: '2025-06-10T16:00:00Z',
    completedAt: '2025-06-10T16:00:27Z'
  }
]

export const mockRunDetail: RunDetail = {
  ...mockRuns[1],
  results: [
    { id: 1,  testId: 'mod05-tc01', testName: 'Create standard budget',               status: 'passed', durationMs: 1200, errorMessage: null, failedStep: null, order: 1 },
    { id: 2,  testId: 'mod05-tc02', testName: 'Create budget with sub-items',          status: 'passed', durationMs: 1850, errorMessage: null, failedStep: null, order: 2 },
    { id: 3,  testId: 'mod05-tc03', testName: 'Edit existing budget line',             status: 'passed', durationMs: 980,  errorMessage: null, failedStep: null, order: 3 },
    { id: 4,  testId: 'mod06-tc01', testName: 'Submit budget for review',              status: 'passed', durationMs: 1400, errorMessage: null, failedStep: null, order: 4 },
    { id: 5,  testId: 'mod06-tc02', testName: 'Approve budget as reviewer',            status: 'passed', durationMs: 1100, errorMessage: null, failedStep: null, order: 5 },
    { id: 6,  testId: 'mod06-tc03', testName: 'Reject budget with comment',            status: 'passed', durationMs: 1300, errorMessage: null, failedStep: null, order: 6 },
    { id: 7,  testId: 'mod31-tc01', testName: 'Apply discount to student account',     status: 'failed', durationMs: 3200, errorMessage: 'Element not found: "Apply Discount" button', failedStep: 'click "Apply Discount"', order: 7 },
    { id: 8,  testId: 'mod31-tc02', testName: 'View discount history',                 status: 'failed', durationMs: 2100, errorMessage: 'Expected modal to be visible but it was not', failedStep: 'assert modal "Discount History" is_visible', order: 8 },
    { id: 9,  testId: 'mod31-tc03', testName: 'Remove applied discount',               status: 'failed', durationMs: 1800, errorMessage: 'Element not found: "Remove" in row "20% Early Payment"', failedStep: 'click "Remove" in row "20% Early Payment"', order: 9 },
    { id: 10, testId: 'mod32-tc01', testName: 'Record student repayment',              status: 'passed', durationMs: 1600, errorMessage: null, failedStep: null, order: 10 },
    { id: 11, testId: 'mod32-tc02', testName: 'View repayment schedule',               status: 'passed', durationMs: 900,  errorMessage: null, failedStep: null, order: 11 },
    { id: 12, testId: 'mod33-tc01', testName: 'Process full refund',                   status: 'passed', durationMs: 2200, errorMessage: null, failedStep: null, order: 12 }
  ]
}

export const mockFiles: TestFile[] = [
  {
    id: 'f0',
    name: 'standard-login.axtest',
    path: 'auth/standard-login.axtest',
    updatedAt: '2025-06-10T08:00:00Z',
    content: `AUTH standard-login

STEPS
  navigate to "/login"
  type "admin@example.com" in "Email"
  type "password123" in "Password"
  click "Login"

ASSERT
  assert "Dashboard" is_visible`
  },
  {
    id: 'f1',
    name: 'mod05-budget.axtest',
    path: 'modules/mod05-budget.axtest',
    updatedAt: '2025-06-15T09:00:00Z',
    content: `---
title: Module 05 — Budget Creation
base_url: https://portal.ssmas.com
---

AUTH standard-login

TEST "Create standard budget"
  STEPS
    navigate to /budget
    click "New Budget"
    type "Annual Operating Budget 2025" in "Budget Name"
    select "Operating" in "Budget Type"
    click "Save"
  ASSERT
    assert "Budget saved successfully" is_visible
    assert url contains /budget/

TEST "Create budget with sub-items"
  STEPS
    navigate to /budget
    click "New Budget"
    type "Capital Expenditure Q1" in "Budget Name"
    click "Add Line Item"
    type "Office Equipment" in "Item Description"
    type "5000" in "Amount"
    click "Save"
  ASSERT
    assert "Budget saved successfully" is_visible
    assert "Office Equipment" is_visible

TEST "Edit existing budget line"
  STEPS
    navigate to /budget
    click "Annual Operating Budget 2025"
    click "Edit" in row "Office Supplies"
    clear "Amount"
    type "3500" in "Amount"
    click "Update"
  ASSERT
    assert "Budget updated" is_visible`
  },
  {
    id: 'f2',
    name: 'mod06-review.axtest',
    path: 'modules/mod06-review.axtest',
    updatedAt: '2025-06-14T14:00:00Z',
    content: `---
title: Module 06 — Budget Review
base_url: https://portal.ssmas.com
---

AUTH standard-login

TEST "Submit budget for review"
  DEPENDS ON "Create standard budget"
  STEPS
    navigate to /budget
    click "Annual Operating Budget 2025" in row
    click "Submit for Review"
  ASSERT
    assert modal "Confirm Submission" is_visible
    assert "Submit" is_enabled

TEST "Approve budget as reviewer"
  STEPS
    navigate to /budget/review
    click "Annual Operating Budget 2025" in row
    click "Approve"
    type "Looks good, approved." in "Reviewer Comment"
    click "Confirm Approval"
  ASSERT
    assert "Budget approved" is_visible
    assert "Approved" is_visible in row "Annual Operating Budget 2025"

TEST "Reject budget with comment"
  STEPS
    navigate to /budget/review
    click "Capital Expenditure Q1" in row
    click "Reject"
    type "Amounts need revision before approval." in "Rejection Reason"
    click "Confirm Rejection"
  ASSERT
    assert "Budget rejected" is_visible`
  },
  {
    id: 'f3',
    name: 'mod31-discounts.axtest',
    path: 'modules/mod31-discounts.axtest',
    updatedAt: '2025-06-12T10:00:00Z',
    content: `---
title: Module 31 — Student Discounts
base_url: https://portal.ssmas.com
---

AUTH admin-login

TEST "Apply discount to student account"
  STEPS
    navigate to /students
    type "S001" in "Search Students"
    click "Search"
    click "Apply Discount" in row "John Mensah"
    select "20% Early Payment" in "Discount Type"
    click "Apply"
  ASSERT
    assert "Discount applied successfully" is_visible

TEST "View discount history"
  STEPS
    navigate to /students
    click "John Mensah" in row
    click "Discount History"
  ASSERT
    assert modal "Discount History" is_visible
    assert "20% Early Payment" is_visible

TEST "Remove applied discount"
  STEPS
    navigate to /students
    click "John Mensah" in row
    click "Discount History"
    click "Remove" in row "20% Early Payment"
    click "Confirm"
  ASSERT
    assert "Discount removed" is_visible`
  },
  {
    id: 'f4',
    name: 'mod32-repayments.axtest',
    path: 'modules/mod32-repayments.axtest',
    updatedAt: '2025-06-11T09:00:00Z',
    content: `---
title: Module 32 — Repayments
base_url: https://portal.ssmas.com
---

AUTH standard-login

TEST "Record student repayment"
  STEPS
    navigate to /repayments
    click "New Repayment"
    type "S001" in "Student ID"
    type "500" in "Amount"
    select "Bank Transfer" in "Payment Method"
    click "Record Payment"
  ASSERT
    assert "Repayment recorded" is_visible

TEST "View repayment schedule"
  STEPS
    navigate to /repayments
    click "S001" in row
  ASSERT
    assert "Repayment Schedule" is_visible
    assert "500.00" is_visible`
  },
  {
    id: 'f5',
    name: 'student-login.axtest',
    path: 'scenarios/student-login.axtest',
    updatedAt: '2025-06-15T12:00:00Z',
    content: `---
title: Student Login — Seed Demo
base_url: https://portal.ssmas.com
---

AUTH standard-login

RULES
  field "Email" must_be email
  field "Password" is required
  field "Password" length between 8 and 64
  on invalid_login show error "Invalid credentials"
  on empty_submit show error "required"
  url contains "/dashboard"

TEST "Login with valid student credentials"
  ID seed-login-001
  TAG seed
  STEPS
    navigate to /login
    type "student@ssmas.com" in "Email"
    type "StudentPass123" in "Password"
    click "Login"
  ASSERT
    assert "Student Dashboard" is_visible
    assert url contains /dashboard`
  }
]

export const mockTaskflowFiles: TestFile[] = [
  {
    id: 'tf-auth-1',
    name: 'standard-login.axtest',
    path: 'auth/standard-login.axtest',
    updatedAt: '2026-06-16T07:10:00Z',
    content: `AUTH standard-login

STEPS
  navigate to /login
  type "qa@taskflow.app" in "Email"
  type "Password123!" in "Password"
  click "Sign in"

ASSERT
  assert "Tasks" is_visible`
  },
  {
    id: 'tf-mod-1',
    name: 'add-task.axtest',
    path: 'modules/todos/add-task.axtest',
    updatedAt: '2026-06-16T07:10:00Z',
    content: `---
title: Add task
base_url: https://todo.taskflow.app
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
    navigate to /tasks
    click "Add task"
    type "Buy groceries" in "Task title"
    click "Save"
  ASSERT
    assert "Buy groceries" is_visible
    assert toast shows "Task created"`
  },
  {
    id: 'tf-mod-2',
    name: 'complete-task.axtest',
    path: 'modules/todos/complete-task.axtest',
    updatedAt: '2026-06-16T07:10:00Z',
    content: `---
title: Complete task
base_url: https://todo.taskflow.app
---

AUTH standard-login

TEST "Mark task complete — seed"
  TAG seed
  STEPS
    navigate to /tasks
    click "Buy groceries"
    click "Mark complete"
  ASSERT
    assert "Buy groceries" is_visible
    assert url contains "filter=active"`
  },
  {
    id: 'tf-mod-3',
    name: 'filter-tasks.axtest',
    path: 'modules/todos/filter-tasks.axtest',
    updatedAt: '2026-06-16T07:10:00Z',
    content: `---
title: Filter tasks
base_url: https://todo.taskflow.app
---

AUTH standard-login

TEST "Filter completed tasks — seed"
  TAG seed
  STEPS
    navigate to /tasks
    click "Completed"
  ASSERT
    assert "Completed" is_visible
    assert url contains "filter=done"`
  },
  {
    id: 'tf-scn-1',
    name: 'smoke.axtest',
    path: 'scenarios/smoke.axtest',
    updatedAt: '2026-06-16T07:10:00Z',
    content: `---
title: Smoke
base_url: https://todo.taskflow.app
---

AUTH standard-login

TEST "Open tasks dashboard"
  TAG seed
  STEPS
    navigate to /tasks
  ASSERT
    assert "Tasks" is_visible`
  }
]
