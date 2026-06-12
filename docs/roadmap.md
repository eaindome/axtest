# axtest — Build Roadmap

---

## Guiding Principle

Build the smallest thing that proves the core value at each phase.
The core value is: **write a spec, run it, see accurate results.**
Everything else — team features, integrations, AI, visual regression — is built on top of
a reliable execution engine. If the engine is unreliable, nothing else matters.

---

## Phase 1 — Execution Engine (CLI)

**Goal:** Prove the core engine is reliable before investing in any UI.

**What we build:**
- `.axtest` file parser → typed AST
- Element resolver (visible text → aria-label → label → placeholder → title)
- Playwright executor (maps each AST action to a Playwright call)
- Basic reporter (pass/fail per step, screenshots on failure, text summary)
- `axtest run` and `axtest validate` CLI commands
- `axtest init` to scaffold a project

**Action vocabulary to cover in Phase 1:**
`click`, `type`, `select`, `select first from`, `check`, `navigate to`, `wait for`,
`press`, `confirm dialog`, `dismiss dialog`, `upload`

**Assertion vocabulary to cover in Phase 1:**
`is visible`, `is not visible`, `is enabled`, `is disabled`, `equals`, `contains`,
`does not equal`, `toast shows`, `toast contains`, `form error shows`, `url contains`,
`url is`, `modal stays open`, `tab is visible`, `tab is not visible`

**Reusability in Phase 1:**
AUTH and MODULE loading, session caching for auth, per-test AUTH override, DEPENDS ON skip

**Done when:**
`axtest run` can execute the real Module 05 and Module 06 test cases from the SSMAS
project end-to-end and produce accurate pass/fail results with screenshots.

**Stack:** Node.js + TypeScript, Playwright, Zod, Commander

---

## Phase 2 — API Server and Database

**Goal:** Make the engine accessible over HTTP so the web frontend can talk to it.

**What we build:**
- REST API: projects, specs, runs, results endpoints
- SQLite database schema
- Job queue for dispatching test runs to the engine as background workers
- WebSocket endpoint for streaming live step results
- Basic authentication (email + password, JWT)
- Project creation and API key management

**Done when:**
You can POST a spec to the API, trigger a run via API, and receive live step results
over a WebSocket connection.

---

## Phase 3 — Web Frontend (Core UI)

**Goal:** The product is usable end-to-end from a browser. No terminal required.

**What we build:**
- Login / signup
- Project dashboard (summary cards, recent runs)
- Spec editor (Monaco editor with `.axtest` syntax highlighting)
- Test runner (run button, live step feed, screenshots inline)
- Results page (run history, test detail, failure view with screenshot)
- Auth Manager (form-based, credentials stored encrypted)
- Module Manager
- Environments (named environments with base URL + variable overrides)
- Basic team: invite members, roles (Owner / Editor / Viewer)

**Done when:**
A tester can create an account, create a project, write a spec in the browser, run it,
and see results with screenshots — entirely without touching the terminal.

---

## Phase 4 — SaaS Polish and Integrations

**Goal:** A product teams would actually pay for.

**What we build:**
- Visual Spec Builder (form-based alternative to raw editor)
- Run history with trend charts and flakiness detection
- Shareable result links
- Report export (PDF, CSV)
- GitHub/GitLab integration (auto-run on PR, status checks, PR comments)
- Slack integration
- Webhooks
- Billing and plan management (Stripe)
- CLI `push` / `pull` / `diff` commands for syncing local ↔ cloud
- `axtest run --cloud` for running via cloud runner from CI
- Rate limiting, usage tracking, plan enforcement

**Done when:**
The product has a working free tier and a paid tier. A team can sign up, connect their
GitHub repo, and have tests run automatically on every PR.

---

## Phase 5 — Local Agent

**Goal:** Support teams testing apps that are not publicly accessible.

**What we build:**
- Local agent daemon (`axtest agent start`)
- Secure tunnel from the agent to axtest cloud (similar to ngrok)
- `local` environment type in the web app
- Agent status indicator in the dashboard
- Agent management UI

**Done when:**
A team can run axtest against `localhost:3000` with results appearing in the cloud dashboard.

---

## Phase 6 — Advanced Features

*After real users and real feedback. Prioritise based on what users actually ask for.*

**Browser recorder extension:**
- Chrome/Edge extension that watches browser interactions and generates `.axtest` spec steps
- Lower the barrier to writing the first test

**Self-healing selectors:**
- When an element is not found by the standard resolver, try fuzzy matching
- Flag the match for human review before saving permanently
- Reduces test breakage when UI changes

**Remaining action vocabulary:**
- `scroll to`, `hover over`, `right click`, `double click`
- `open action menu in first row of`
- `check first in`
- `type into first`
- Multi-pair STEPS/ASSERT within one TEST

**AI-assisted spec generation:**
- Paste a user story → get a draft `.axtest` spec
- Analyse a module's code → suggest test cases
- Intentionally not in V1 — structure and reliability come first

**Additional testing pipelines (separate modules):**
- Visual regression (screenshot comparison)
- Accessibility testing
- Performance/load testing

---

## V1 vs Final Comparison

| | V1 (Phases 1–3) | Final Vision |
|---|---|---|
| **Spec authoring** | Raw `.axtest` editor in browser | + Visual builder, browser recorder extension |
| **Element finding** | Semantic resolver (text, label, aria) | + Self-healing with review step |
| **Auth** | Single auth flow per test, per-test override | + Multi-session, role-switching mid-test |
| **Execution** | Chromium, sequential, cloud-only (public URLs) | + Firefox + WebKit, parallel, local agent |
| **Reporting** | Pass/fail per step, screenshots, text summary | + Trend charts, flakiness, comparison, PDF/CSV export |
| **Team** | Invite by email, Owner/Editor/Viewer | + SSO, audit logs, granular permissions |
| **Integrations** | None | + GitHub/GitLab, Slack, Webhooks, REST API |
| **Billing** | Not required | Stripe, Free/Pro/Team tiers |
| **Test generation** | Human-written only | + AI-assisted from user stories or codebase |
| **Testing types** | UI/E2E only | + Visual regression, accessibility, performance |

---

## What is Intentionally Out of Scope (Forever)

- axtest does not replace unit tests or integration tests
- axtest does not test APIs directly (it tests the UI that calls APIs)
- axtest does not generate test data or manage database seeding
- axtest does not test native mobile apps (web apps in a browser only, in V1)
