import { DOC_GROUPS } from './groups'
import { ADD_TASK_SPEC, COMPLETE_TASK_SPEC, FILTER_TASKS_SPEC, TASKFLOW_APP } from './todo-specs'

export { DOC_GROUPS }

export interface DocSection {
  id: string
  groupId: string
  title: string
  summary: string
  content: string
  /** Tutorial step number shown in sidebar (optional) */
  step?: number
}

export const DOC_SECTIONS: DocSection[] = [
  // ── Start here ──────────────────────────────────────────────
  {
    id: 'welcome',
    groupId: 'start',
    title: 'Welcome to axtest',
    summary: 'What this tool does and how you will learn it.',
    content: `axtest is a **test automation workbench** for QA teams. You write browser tests in plain **.axtest** files — one file per feature or module — then run them against staging, production, or local environments.

Unlike one-off scripts, axtest is built around a repeatable workflow:

1. **Model** the feature (metadata + rules)
2. **Seed** one golden-path test
3. **Generate** positive, negative, and edge variants
4. **Run** and triage in the editor

> **How to use this knowledge base**
> Work through the **Todo app tutorial** in order (Steps 1–8). Each lesson uses the same fictional app — **TaskFlow Todo** — so concepts stack naturally. Keep the **Test Editor** open in another tab and type along.

| You will learn | By doing |
|----------------|----------|
| File format | Building \`modules/todos/add-task.axtest\` |
| Visual editor | Editing TaskFlow specs without memorizing syntax |
| Rules + generation | Turning one seed into a scenario matrix |
| Assertions | Checking UI state after each action |
| Runs | Executing against staging / local URLs |`,
  },
  {
    id: 'taskflow-app',
    groupId: 'start',
    title: 'Meet TaskFlow Todo',
    summary: 'Our training app — a simple todo product we test end-to-end.',
    content: `Throughout this guide we pretend **TaskFlow Todo** is a real product your team ships. You do not need the app running locally; the specs teach you axtest syntax and workflow. When you do connect a real app, swap URLs and labels.

## What TaskFlow does

| Screen | User actions |
|--------|----------------|
| **Login** | Email + password → dashboard |
| **Task list** | See active tasks, filters (Active / Completed) |
| **Add task** | Modal with "Task title", Save / Cancel |
| **Task row** | Mark complete, delete |

## URLs we use

| Environment | Base URL |
|-------------|----------|
| Production | \`${TASKFLOW_APP.productionUrl}\` |
| Staging | \`${TASKFLOW_APP.stagingUrl}\` |
| Local dev | \`${TASKFLOW_APP.localUrl}\` |

## Project layout in axtest

\`\`\`text
TaskFlow Todo (project)
├── auth/
│   └── standard-login.axtest      ← shared login flow
├── modules/
│   └── todos/
│       ├── add-task.axtest        ← tutorial focus
│       ├── complete-task.axtest
│       └── filter-tasks.axtest
└── scenarios/
    └── smoke.axtest               ← cross-module checks
\`\`\`

> **Practical tip**
> Put **one feature per file**. \`add-task.axtest\` owns creation rules and tests; \`complete-task.axtest\` owns completion. Shared login stays in \`auth/\`.`,
  },

  // ── Todo tutorial ───────────────────────────────────────────
  {
    id: 'tutorial-1-create-file',
    groupId: 'tutorial',
    step: 1,
    title: 'Create your first spec',
    summary: 'New file, frontmatter, and AUTH for TaskFlow.',
    content: `## Goal

Create \`modules/todos/add-task.axtest\` and define **what** we are testing before writing steps.

## Steps in the editor

1. Open **Test Editor** → select project **TaskFlow Todo** (or your sandbox project)
2. In the file explorer, right-click \`modules/todos/\` → **New file** → \`add-task.axtest\`
3. Switch to **Code** view and paste the skeleton below
4. Switch to **Visual** → **File setup** to confirm title and URL

## File skeleton

\`\`\`text
---
title: Add task
base_url: ${TASKFLOW_APP.productionUrl}
---

AUTH standard-login

RULES
  field "Task title" is required
\`\`\`

## What each part means

| Part | Purpose in TaskFlow |
|------|---------------------|
| \`title:\` | Shows in outline and run reports |
| \`base_url:\` | Default origin; combined with \`navigate to /tasks\` |
| \`AUTH standard-login\` | Runs login steps from \`auth/standard-login.axtest\` before each test |
| \`RULES\` | Constraints the generator uses for negative/edge cases (expanded in Step 4) |

> **Checkpoint**
> Save the file. You should see **Add task** in the outline with no tests yet — that is expected.`,
  },
  {
    id: 'tutorial-2-seed-test',
    groupId: 'tutorial',
    step: 2,
    title: 'Write the seed test',
    summary: 'Golden path: open modal, type title, save, assert success.',
    content: `## Goal

One **seed** test that proves "user can add a task" on TaskFlow. Every generated variant will branch from this.

## The happy path (what a human would do)

1. Go to the task list
2. Click **Add task**
3. Type **Buy groceries** in **Task title**
4. Click **Save**
5. See the new task in the list and a success toast

## In Visual editor

1. Open **Test cases** tab → **+ Add test**
2. Name: \`Add a new task — seed\`
3. **Kind** → **Seed**
4. Add steps using the verb dropdowns (navigate → click → type → click)
5. Under **Assert**, add:
   - **Is visible** → \`Buy groceries\`
   - **Toast message** → \`Task created\`

## In Code view

\`\`\`text
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
\`\`\`

## Run it

1. Toolbar → environment **Staging** (set URL if prompted)
2. Click **Run** on the seed card only
3. Seed must **pass** before Generate is available

> **Common mistakes**
> - Quoted labels must match the UI exactly: \`"Task title"\` not \`"Title"\`
> - Seed must be tagged **seed** and pass — otherwise Generate stays disabled`,
  },
  {
    id: 'tutorial-3-rules',
    groupId: 'tutorial',
    step: 3,
    title: 'Add validation rules',
    summary: 'Tell axtest how TaskFlow should behave when input is wrong.',
    content: `## Goal

Rules are **structured constraints** — not free-text notes. They describe what TaskFlow must enforce and what **Generate** should use when building negative tests.

## Rules for add-task

In **File setup → Rules** (or the \`RULES\` block in code):

\`\`\`text
RULES
  field "Task title" is required
  field "Task title" length between 1 and 120
  on empty_title show error "Title is required"
  on invalid_title show error "Title is too long"
  element "Add task" is_enabled
\`\`\`

## How rules map to tests

| Rule | Generated / manual test idea |
|------|------------------------------|
| \`field "Task title" is required\` | Empty title → error message |
| \`length between 1 and 120\` | 256-character title → "too long" |
| \`on empty_title show error "…"\` | Assert exact copy in negative test |
| \`element "Add task" is_enabled\` | Positive check that button is clickable |

> **Why structure matters**
> If rules are vague bullets, the generator guesses. Structured verbs (\`field\`, \`on\`, \`element\`) keep generated asserts aligned with your product copy.

## Exercise

Add one **note** rule documenting a product quirk:

\`\`\`text
note "Save stays disabled until title has at least one non-space character"
\`\`\`

Rules do not run by themselves — they guide you and **Generate**.`,
  },
  {
    id: 'tutorial-4-generate',
    groupId: 'tutorial',
    step: 4,
    title: 'Generate test variants',
    summary: 'From one seed to positive, negative, and edge cases.',
    content: `## Goal

After the seed passes, let axtest propose a **scenario matrix** for TaskFlow add-task.

## Steps

1. **Run** the seed — status must be green
2. Click **Generate** on the seed card
3. Review new tests inserted below the seed
4. Filter by **Negative** and **Edge** in the outline chips

## What Generate typically adds

| Kind | TaskFlow example |
|------|------------------|
| **Positive** | Alternate valid title in \`Task title\` |
| **Negative** | Empty title → assert \`Title is required\` |
| **Negative** | Invalid characters → error state |
| **Edge** | Very long title (256 chars) |
| **Edge** | Whitespace-only title |

## Full file after generation (excerpt)

\`\`\`text
${ADD_TASK_SPEC}
\`\`\`

## After generation — your job as QA

1. **Read every step** — generators are conservative; fix labels if your app differs
2. **Adjust asserts** — use structured assertion types (Is visible, Toast, etc.)
3. **Run file** — toolbar **Run** for the whole suite
4. **Re-generate safely** — clicking Generate again skips variants that already exist

> **Depends on**
> Generated tests reference the seed name in \`DEPENDS ON\`. If you rename the seed, update dependents.`,
  },
  {
    id: 'tutorial-5-assertions',
    groupId: 'tutorial',
    step: 5,
    title: 'Assertions that stick',
    summary: 'Structured asserts for TaskFlow UI checks.',
    content: `## Goal

Assertions are how you **prove** the test finished in the right state. TaskFlow examples below map to Visual editor dropdowns.

## Assertion catalog (TaskFlow examples)

| Type | When to use | Example line |
|------|-------------|--------------|
| Is visible | Task or message on screen | \`assert "Buy groceries" is_visible\` |
| Is not visible | Modal closed | \`assert "Add task" is_not_visible\` |
| Toast message | Feedback banner | \`assert toast shows "Task created"\` |
| URL contains | Filter or redirect | \`assert url contains "/tasks"\` |
| Contains text | Partial match in heading | \`assert "Task list" contains "3 tasks"\` |
| Modal is open | Dialog still open | \`assert modal is open\` |

## Good vs weak asserts

| Weak | Stronger |
|------|----------|
| \`assert "Success" is_visible\` | \`assert toast shows "Task created"\` |
| \`assert "error" is_visible\` | \`assert "Title is required" is_visible\` |
| No assert after delete | \`assert "Buy groceries" is_not_visible\` |

## Exercise — complete-task module

Add a seed in \`complete-task.axtest\`:

\`\`\`text
${COMPLETE_TASK_SPEC}
\`\`\`

Use **Is visible** plus **URL contains** together when filters change the query string.`,
  },
  {
    id: 'tutorial-6-visual',
    groupId: 'tutorial',
    step: 6,
    title: 'Visual editor walkthrough',
    summary: 'File setup vs Test cases — editing TaskFlow without syntax stress.',
    content: `## Two panels, one file

| Tab | TaskFlow work |
|-----|----------------|
| **File setup** | Title, base URL, auth, rules for add-task |
| **Test cases** | Seed + generated tests, steps, asserts |

## File setup checklist (add-task)

- [ ] Title: \`Add task\`
- [ ] Base URL: production URL (overridden per environment at run time)
- [ ] Auth: \`standard-login\`
- [ ] Rules: required field + error messages

## Test card anatomy

Each TaskFlow test card has:

1. **Kind badge** — Seed / Positive / Negative / Edge
2. **Steps** — verb dropdown + fields (e.g. type \`Buy groceries\` in \`Task title\`)
3. **Assert** — type dropdown + targets (no free-form guessing)
4. **Run** / **Generate** (seed only, after pass)

## Outline + filters

The right **Outline** panel mirrors test cards:

- Click a test name to scroll the visual editor
- Use **Seed 1 · Negative 2** filter chips to focus while triaging failures
- **Last run** summary shows pass/fail counts for the file

> **When to use Code vs Visual**
> - **Visual** — teaching new teammates, editing steps/asserts, rules
> - **Code** — bulk edits, copy-paste from this guide, regex refactors`,
  },
  {
    id: 'tutorial-7-environments',
    groupId: 'tutorial',
    step: 7,
    title: 'Run against environments',
    summary: 'Staging, local, and production for TaskFlow.',
    content: `## Goal

Run the same \`add-task.axtest\` against different TaskFlow deployments without duplicating files.

## Toolbar environments

| Environment | TaskFlow URL source |
|-------------|---------------------|
| **Production** | Project \`base_url\` (read-only in toolbar) |
| **Staging** | Override e.g. \`${TASKFLOW_APP.stagingUrl}\` |
| **Local** | Override e.g. \`${TASKFLOW_APP.localUrl}\` |

## First-time setup

1. Switch environment to **Local**
2. Modal appears — enter your dev server URL or **Use production URL**
3. URL chip in toolbar shows the **effective** URL for runs

## Run scopes

| Action | Scope |
|--------|-------|
| Toolbar **Run** | Entire file (all TaskFlow add-task tests) |
| Card **Run** | Single test (debug one failure) |
| After save | Unsaved dot on filename — save before sharing results |

## Reading results

- Bottom **Results** panel lists each test with duration
- Failed rows show which assert failed
- Outline **Last run** badge gives quick pass/fail ratio

> **Practical habit**
> Develop on **Local**, PR checks on **Staging**, release smoke on **Production** — same file, three URLs.`,
  },
  {
    id: 'tutorial-8-organize',
    groupId: 'tutorial',
    step: 8,
    title: 'Organize a growing suite',
    summary: 'Multiple TaskFlow modules, folders, and smoke scenarios.',
    content: `## Goal

TaskFlow grows beyond add-task. Structure files so teammates find specs quickly.

## Recommended tree

\`\`\`text
modules/todos/
  add-task.axtest       ← creation + validation
  complete-task.axtest  ← mark done / undo
  delete-task.axtest    ← remove + confirm dialog
  filter-tasks.axtest   ← active vs completed tabs
scenarios/
  smoke.axtest          ← imports critical paths only
auth/
  standard-login.axtest
\`\`\`

## Filter tasks — second seed example

\`\`\`text
${FILTER_TASKS_SPEC}
\`\`\`

## Explorer operations

| Action | How |
|--------|-----|
| New folder | Right-click → New folder → \`modules/todos\` |
| Move file | Drag \`add-task.axtest\` into \`todos/\` |
| Rename | Context menu → Rename (updates paths, not test names inside) |
| Delete | Context menu → Delete (careful — no undo) |

## Graduation exercise

1. Create \`filter-tasks.axtest\` with the seed above
2. Add rules: \`url contains "filter=done"\` when Completed tab is active
3. Run seed → Generate → run full file
4. Open **Knowledge base** only when stuck — you now have a full TaskFlow todo suite`,
  },

  // ── Reference ───────────────────────────────────────────────
  {
    id: 'ref-file-format',
    groupId: 'reference',
    title: 'File format reference',
    summary: 'Frontmatter, AUTH, RULES, TEST blocks.',
    content: `Complete TaskFlow add-task file:

\`\`\`text
${ADD_TASK_SPEC}
\`\`\`

| Block | Required | Notes |
|-------|----------|-------|
| \`---\` frontmatter | Recommended | \`title\`, \`base_url\` |
| \`AUTH\` | Optional | References \`auth/*.axtest\` |
| \`RULES\` | Optional | Structured validation lines |
| \`TEST\` | At least one | \`STEPS\` + \`ASSERT\` sections |
| \`TAG\` | Optional | \`seed\`, \`positive\`, \`negative\`, \`edge\` |
| \`DEPENDS ON\` | Optional | Prior test must pass first |
| \`GENERATED FROM\` | Auto | Set by generator on variants |`,
  },
  {
    id: 'ref-steps',
    groupId: 'reference',
    title: 'Step verbs',
    summary: 'navigate, click, type, select, clear.',
    content: `| Verb | Syntax | TaskFlow example |
|------|--------|------------------|
| navigate | \`navigate to /path\` | \`navigate to /tasks\` |
| click | \`click "Label"\` | \`click "Add task"\` |
| click in row | \`click "Delete" in row "Buy groceries"\` | Delete one task |
| type | \`type "text" in "Field"\` | \`type "Buy milk" in "Task title"\` |
| select | \`select "High" in "Priority"\` | Priority dropdown |
| clear | \`clear "Search"\` | Clear filter input |

Code view supports additional verbs (wait, press, dialog) via autocomplete — add Visual support over time.`,
  },
  {
    id: 'ref-rules',
    groupId: 'reference',
    title: 'Rules reference',
    summary: 'All structured rule types.',
    content: `| Type | Syntax |
|------|--------|
| Required | \`field "Task title" is required\` |
| Format | \`field "Email" must_be email\` |
| Length | \`field "Task title" length between 1 and 120\` |
| Range | \`field "Priority" between 1 and 5\` |
| Error | \`on empty_title show error "Title is required"\` |
| URL | \`url contains "/tasks"\` |
| Visibility | \`element "Modal" is_visible\` |
| State | \`element "Save" is_disabled\` |
| Note | \`note "Documented quirk for QA"\` |`,
  },
  {
    id: 'ref-assertions',
    groupId: 'reference',
    title: 'Assertions reference',
    summary: 'Supported assert types in Visual + lint.',
    content: `| Visual type | Serialized form |
|-------------|-----------------|
| Is visible | \`assert "Buy groceries" is_visible\` |
| Is not visible | \`assert "Modal" is_not_visible\` |
| Is enabled | \`assert "Save" is_enabled\` |
| Is disabled | \`assert "Save" is_disabled\` |
| Contains text | \`assert "Header" contains "3 tasks"\` |
| Toast message | \`assert toast shows "Task created"\` |
| URL contains | \`assert url contains "/tasks"\` |
| Modal is open | \`assert modal is open\` |

Lint warns on unrecognized assert lines. Fix in Visual by picking a type from the dropdown.`,
  },

  // ── Workflows ───────────────────────────────────────────────
  {
    id: 'wf-generation',
    groupId: 'workflows',
    title: 'Generation workflow',
    summary: 'Seed → pass → generate → review.',
    content: `1. One **seed** per feature file (TaskFlow: one per module like add-task)
2. **Run** seed until green
3. **Generate** — skips duplicate variant suffixes if you click again
4. Review negative asserts match **RULES** error strings
5. **Save** and run full file before merge

Generator reads type/select steps to vary fields. More rules = more realistic negatives.`,
  },
  {
    id: 'wf-running',
    groupId: 'workflows',
    title: 'Running & triage',
    summary: 'Environments, results panel, lint.',
    content: `| Control | Effect |
|---------|--------|
| Env dropdown | staging / production / local |
| URL chip | Edit override for staging & local |
| Toolbar Run | All tests in file |
| Card Run | Single test |
| \`N err\` in toolbar | Jump to code lint error (code view) |

Save when the amber dot appears on the filename. Results panel shows environment used for that run.`,
  },
  {
    id: 'wf-explorer',
    groupId: 'workflows',
    title: 'File explorer',
    summary: 'Folders, DnD, context menu.',
    content: `Default folders: \`auth/\`, \`modules/\`.

- **Right-click** file or folder for rename, delete, new child
- **Drag and drop** to move between folders
- Keep **auth** flows shared; feature files under **modules/**\`

TaskFlow tutorial tree is the recommended pattern for real projects.`,
  },
  {
    id: 'cheat-sheet',
    groupId: 'workflows',
    title: 'Quick cheat sheet',
    summary: 'One-page TaskFlow reminder.',
    content: `## Minimal seed (TaskFlow add-task)

\`\`\`text
TEST "Add a new task — seed"
  TAG seed
  STEPS
    navigate to /tasks
    click "Add task"
    type "Buy groceries" in "Task title"
    click "Save"
  ASSERT
    assert "Buy groceries" is_visible
    assert toast shows "Task created"
\`\`\`

## Keyboard

| Key | Action |
|-----|--------|
| Ctrl+S | Save file |
| Ctrl+K | Global search (sidebar) |

## Test kinds

| Kind | Meaning |
|------|---------|
| Seed | Golden path — generate from this |
| Positive | Another valid path |
| Negative | Should show error |
| Edge | Boundary / abuse |
| Manual | No tag — hand-written |

## Where to click in the editor

| I want to… | Go to… |
|------------|--------|
| Edit rules | Visual → File setup |
| Edit steps | Visual → Test cases → expand card |
| See all tests | Outline panel (right) |
| Change URL | Toolbar env + URL chip |
| Learn by doing | Tutorial Steps 1–8 in this guide |`,
  },
]

export function getDocSection(id: string): DocSection | undefined {
  return DOC_SECTIONS.find(s => s.id === id)
}

export function getDocSectionsByGroup(groupId: string): DocSection[] {
  return DOC_SECTIONS.filter(s => s.groupId === groupId)
}

export const TUTORIAL_SECTIONS = DOC_SECTIONS.filter(s => s.groupId === 'tutorial' && s.step != null)
