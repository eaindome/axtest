# axtest Web Application — Features and Functionalities

---

## Overview

The web application is the primary product. Users write specs, run tests, view results,
and manage their team entirely through the browser. No terminal required for the core workflow.

The CLI is available for developers who prefer it and for CI/CD pipelines, but every
action the CLI can do is also available in the web app.

---

## 1. Dashboard

The home screen. Shows the health of all projects at a glance.

**Summary cards:**
- Total tests across all suites
- Pass rate from the last run
- Number of currently failing tests
- Average run duration (last 7 days)

**Recent runs feed:**
- Last 5 runs per project: date, triggered by, duration, pass/fail count
- One-click re-run from any past run
- Visual pass/fail indicator (green/red)

**Trend chart:**
- Pass/fail rate over the last 30 days
- Filterable by project, module, or test tag

**Flaky test panel:**
- Tests that have both passed and failed within the last 7 days
- Flakiness score (how often they fail)
- Quick link to investigate

---

## 2. Spec Editor

Where test specs are written and maintained. Feels like a lightweight VS Code in the browser.

**File tree (left panel):**
- Folder structure: `auth/`, `modules/`, `tests/`
- Create, rename, move, delete files and folders
- Visual indicator on files with recent changes or current failures

**Code editor (main panel):**
- Monaco editor (same engine as VS Code)
- `.axtest` syntax highlighting
- Inline validation as you type — red underlines for unknown actions, missing quotes,
  unclosed blocks, invalid assertion syntax
- Autocomplete for actions and assertions from the vocabulary
- `Ctrl+Space` to trigger suggestions

**Side panel (right):**
- Toggle: show last test result for the currently open file
- See which steps passed/failed without leaving the editor
- Quick jump to the failing step's screenshot

**File history:**
- Every save is versioned
- See who changed what and when
- Restore any previous version

---

## 3. Visual Spec Builder

An alternative to the raw text editor for non-developers or people new to axtest.
Builds the same `.axtest` structure under the hood — the output is always portable.

**Step builder:**
- Pick an action from a dropdown (click, type, select, check, etc.)
- Fill in the label/value in a form field
- Add assertion steps the same way
- Drag to reorder steps

**Toggle between modes:**
- Switch between Visual Builder and Code Editor at any time
- Changes in one mode are instantly reflected in the other

**Export:**
- Download the spec as a `.axtest` file
- Push to the cloud or use in CI via CLI

---

## 4. Test Runner

Run tests from the browser and watch them execute.

**Run controls:**
- Run all tests in the project
- Run a specific module file
- Run a single test by clicking it in the file tree
- Environment picker — choose which environment to run against (staging, production, custom)

**Live execution feed:**
- Each step shows as it executes: pending → running → passed / failed
- Step duration shown next to each step
- Inline screenshot thumbnail when a step fails
- Expand any step to see the full element resolution log

**Run options:**
- Bail on first failure
- Run only failed tests from the last run
- Override variables for this run

**Run status:**
- Progress bar showing X of Y tests complete
- Cancel button to abort mid-run
- Pause and resume (future)

---

## 5. Results and Reports

Full history of every test run.

**Run list:**
- Date and time
- Triggered by (user name or CI pipeline)
- Environment
- Duration
- Pass/fail/skip counts with visual bar

**Run detail view:**
- Every test in the run, with status
- Expand a test to see every step
- Failing step shows: error message, element that was searched for, full-size screenshot
- Timeline view: see which tests ran in what order

**Failure investigation:**
- Side-by-side: spec step vs actual screenshot
- Element resolution log: what the resolver tried before failing
- Suggested fix based on the error type (e.g. "Element not found — check if the label
  matches the visible text or aria-label on the element")

**Comparison:**
- Compare two runs side by side (useful for spotting regressions between deploys)

**Shareable links:**
- Any run, any test result, any screenshot has a permanent URL
- Share a failing test result with a teammate or in a Slack message

**Export:**
- PDF report (formatted summary for stakeholders)
- CSV (for teams that want to import into their own tracking tools)
- JSON (machine-readable full results)

**Trend charts:**
- Pass rate per test over time
- Failure frequency — which tests fail the most
- Duration trends — tests that are getting slower

---

## 6. Auth Manager

Create and manage reusable auth flows without writing `.axtest` syntax.

**Auth flow list:**
- All auth flows in the project
- Last used, last modified
- Quick test button (runs the auth flow in a browser and shows pass/fail)

**Auth flow editor:**
- Form-based step builder: action type, label, value
- Preview as `.axtest` syntax
- Test the flow before saving

**Credential management:**
- Values stored in encrypted vault — never shown in plain text after initial save
- Reference as `{{variable_name}}` in the spec
- Variables resolved at run time from the vault or environment override

**Multiple flows:**
- Create as many auth flows as needed (admin user, restricted user, guest, etc.)
- Name them clearly: `standard-login`, `restricted-reviewer`, `budget-manager`

---

## 7. Module Manager

Same as Auth Manager but for reusable navigation/setup flows.

**Module list:**
- All module flows in the project
- Usage count — how many test files reference each module
- Impact warning when editing a module that is referenced by many tests

**Module editor:**
- Step builder
- Preview as `.axtest` syntax
- Test the module flow independently

---

## 8. Environments

Manage different base URLs and variable sets for each testing environment.

**Environment list:**
- Named environments: `staging`, `production`, `local`
- Each environment has a base URL and a set of variable overrides
- Default environment per project

**Environment editor:**
- Name, base URL
- Variable overrides (e.g. different credentials, different fiscal cycle data)
- Variables set here override the project-level `.env` values for this environment

**At run time:**
- Pick environment from a dropdown in the runner
- Or pass `--env staging` from the CLI

**Local environment:**
- Base URL: `http://localhost:3000`
- Requires the local agent to be running
- Marked with a warning if the agent is not connected

---

## 9. Projects and Team

Multi-project, multi-user workspace.

**Projects:**
- Each project represents one application under test
- Project has: name, base URL, default environment, default browser
- Switch between projects from the top navigation

**Team members:**
- Invite by email
- Roles:
  - **Owner** — full access, billing, delete project
  - **Editor** — write specs, run tests, view results
  - **Viewer** — read-only: view specs and results, cannot run or edit
- Pending invitations shown with resend/revoke options
- Audit log: who ran what, who changed which spec

**API keys:**
- Project-scoped API keys for CI/CD
- Generate, rotate, revoke keys
- Each key shows last used date
- Keys are shown once at creation — not retrievable after

---

## 10. Integrations

**GitHub / GitLab:**
- Connect a repository
- Auto-trigger a test run on push to a specified branch or on PR open
- Post pass/fail status check to the PR — blocks merge if tests fail (optional)
- Comment on the PR with a summary of results and links to failures

**Slack:**
- Post a message to a channel when a run fails
- Post when a previously failing test passes again ("back to green")
- Message includes: run summary, links to failures

**Webhooks:**
- Configure a POST to any URL on run complete, run fail, or run pass
- Payload includes: run metadata, pass/fail counts, list of failing tests
- For building custom integrations (Jira tickets, PagerDuty, etc.)

**REST API:**
- Full programmatic access: create runs, fetch results, manage specs
- Used by teams who want to embed axtest results in their own dashboards
- API documentation available in the app

---

## 11. Settings

**Project settings:**
- Name, base URL, default browser, default timeout
- Default environment for runs

**Notification preferences:**
- Per-user: email on run failure, email on daily summary
- Per-project: Slack channel for failure alerts

**Billing:**
- Current plan and usage
- Runs consumed this month vs limit
- Storage used (screenshots)
- Upgrade / downgrade plan
- Invoices and payment method

**Danger zone:**
- Delete project (requires typing project name to confirm)
- Transfer project ownership

---

## Plan Limits (Suggested Tiers)

| | Free | Pro | Team |
|---|---|---|---|
| Projects | 1 | 5 | Unlimited |
| Test runs / month | 100 | Unlimited | Unlimited |
| Team members | 1 | 3 | Unlimited |
| Result history | 7 days | 90 days | 1 year |
| Screenshots | 50 MB | 2 GB | 10 GB |
| Local agent | No | Yes | Yes |
| GitHub integration | No | Yes | Yes |
| SSO | No | No | Yes |
| Support | Community | Email | Priority |
