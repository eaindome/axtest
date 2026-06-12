# axtest — Product Vision

---

## Origin Story

axtest was born from a real frustration. A development team finished building a software
product and were tasked with testing it themselves — no dedicated QA team. Every test case
was tracked manually in Excel sheets: positive cases, negative cases, edge cases, all written
in detail. Each regression cycle meant going through the same spreadsheet again by hand.

The question that started the project: what if the system could just read those test cases
and run them automatically?

---

## The Problem

Many startups and internal dev teams:

- Have no dedicated QA analysts
- Rely on developers to perform manual QA after every release
- Use spreadsheets to track test cases
- Repeat regression testing manually before every deployment
- Struggle to maintain consistent testing workflows across team members

Existing automation tools don't fit:

- **Playwright / Cypress** — require JavaScript/TypeScript expertise; testers write code, not tests
- **Katalon Studio** — feature-rich but heavy, slow to onboard, complex UI
- **Testim / Mabl** — AI-powered but expensive ($300+/month), SaaS-only, black-box
- **Cucumber / Gherkin** — human-readable specs, but step definitions still require code
- **Selenium** — old, verbose, painful to maintain

The gap: there is no tool that lets a developer or a non-developer tester write structured,
human-readable test cases and run them automatically — without writing code, without a
dedicated QA budget, and without a steep learning curve.

---

## The Solution

axtest is a structured QA automation platform for developer-led teams.

The core idea:

> Write test cases the way a human tester thinks. axtest runs them.

A test case in axtest looks like this:

```
TEST P-01: Create a new budget with only the required field

STEPS
  click "New"
  click tab "Core"
  select first from "Fiscal Cycle"
  click "Save"

ASSERT
  toast shows "Budget created successfully"
  left panel contains "PENDING"
```

No code. No selectors. No framework knowledge. If you can write a test case for a
manual tester to follow, you can write an axtest spec.

---

## Target Audience

**Primary:** Small-to-mid dev teams (2–20 developers) at startups and product companies
who build and test their own software. No dedicated QA department. Testing is a developer
responsibility.

**Secondary:** Freelance developers and agencies who deliver web applications and need to
verify functionality before handoff.

**Not targeting (initially):** Enterprise QA teams with dedicated automation engineers,
teams that need regulatory compliance testing, teams already proficient in Playwright/Cypress.

---

## Design Philosophy

1. **Readable by anyone** — a product manager should understand a spec file without training.
2. **No selector knowledge required** — elements are found by what users see, not DOM structure.
3. **Fail loudly and helpfully** — errors tell you exactly what to fix, not just that something broke.
4. **Reuse without repetition** — auth and navigation steps are defined once and reused everywhere.
5. **Structure over magic** — the platform does exactly what the spec says. No guessing.
6. **Reliability first** — a test that always gives the correct answer is more valuable than a
   test that sometimes self-heals and sometimes lies.

AI capabilities are intentionally not the foundation of V1. Structure and determinism come first.
AI becomes an enhancement layer later (test generation, smart suggestions).

---

## Competitive Positioning

| | axtest | Cypress/Playwright | Katalon | Testim/Mabl |
|---|---|---|---|---|
| Requires coding | No | Yes | Partially | No |
| Human-readable specs | Yes | No | No | No |
| Version-controllable specs | Yes | Yes | No | No |
| Self-hosted option | Yes | Yes | Yes | No |
| SaaS option | Yes | Via Cypress Cloud | Via Katalon Cloud | Yes only |
| Pricing | Freemium | Free (tool) / Paid (cloud) | Free (tool) / Paid (cloud) | $300+/month |
| Learning curve | Low | High | Medium | Low |
| Reusable auth/module flows | Yes (built-in) | Manual | Partial | Partial |
| Target team size | 2–20 | Any | 10+ | 10+ |

**axtest's differentiation:**
- The only tool where specs are plain structured text — readable, diffable, committable to git
- The only tool with a built-in reusable hierarchy (Auth → Module → Test) that mirrors
  how manual testers already organize their work
- Lowest time-to-first-passing-test: `axtest init` → write a spec → `axtest run`

---

## What axtest Is Not

- Not a replacement for unit tests or integration tests — those test code; axtest tests the UI
- Not a performance testing tool (in V1)
- Not a visual regression tool (in V1)
- Not a security scanning tool (in V1)
- Not trying to "guess" what testers mean — specs must be explicit

---

## V1 vs Final Vision

### V1 — What Ships First

A working SaaS product where a team can:

- Write test specs in the browser-based editor
- Run them against a publicly accessible web app
- See live results with screenshots
- Invite teammates to view and edit specs
- Trigger runs from CI/CD via the CLI

The core promise: **replace the manual regression spreadsheet with one-click automated runs.**

### Final Vision

A complete testing ecosystem:

- Browser recorder extension (watch you click → generate the spec)
- Local agent for testing private/internal apps
- AI-assisted spec generation from user stories or codebases
- Self-healing selectors (when UI changes, tests adapt with a review step)
- Additional testing pipelines: visual regression, performance, accessibility
- Centralized QA dashboard with team analytics
- Multi-environment orchestration
