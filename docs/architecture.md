# axtest — System Architecture

---

## Product Model

axtest is a SaaS product. Users access it via a web application. There is also a CLI for
developers who prefer terminal workflows and for CI/CD pipeline integration.

---

## The Network Access Challenge

axtest's Playwright runners live on axtest's servers. The application being tested lives
on the user's server. This creates a connectivity problem:

- A publicly accessible app (staging URL, production URL) → no problem, cloud runner reaches it
- A locally running app (`localhost:3000`) or internal app (behind VPN/firewall) → cloud runner cannot reach it

**V1 solution:** Support publicly accessible URLs only. Most teams test against a staging
environment, which is publicly accessible.

**Later solution:** Local Agent — a lightweight process the user runs on their machine.
The agent executes tests locally using the local Playwright installation but streams results
back to the axtest cloud in real time. This is how Cypress Cloud handles the same problem.

---

## System Components

```
┌──────────────────────────────────────────────────────────────┐
│                      Web Application                          │
│                    (React / Next.js)                          │
│                                                               │
│  Spec Editor │ Test Runner │ Dashboard │ Auth/Module Manager  │
│  Results │ Integrations │ Team Management │ Billing           │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTP + WebSocket
┌──────────────────────────▼───────────────────────────────────┐
│                       API Server                              │
│                  (Node.js / Express)                          │
│                                                               │
│  /projects  /specs  /runs  /results  /users  /integrations   │
└───────────┬──────────────────────────────────┬───────────────┘
            │                                  │
┌───────────▼──────────────┐    ┌──────────────▼──────────────┐
│        Database           │    │      Execution Engine        │
│   (SQLite → PostgreSQL)   │    │                              │
│                           │    │  Parser                      │
│  projects, specs, runs,   │    │    ↓  (.axtest → AST)        │
│  results, screenshots,    │    │  Resolver                    │
│  users, teams, secrets    │    │    ↓  (loads AUTH, MODULE)   │
└───────────────────────────┘    │  Playwright Executor         │
                                 │    ↓  (AST → browser actions)│
                                 │  Reporter                     │
                                 │    ↓  (results + screenshots) │
                                 └──────────────────────────────┘
                                              │
                           ┌──────────────────▼──────────────────┐
                           │             axtest CLI               │
                           │                                      │
                           │  Local mode: runs engine directly    │
                           │  Cloud mode: calls API, streams back │
                           └──────────────────────────────────────┘
```

---

## Components in Detail

### Web Application (Frontend)

**Technology:** React + Next.js

The primary user interface. Everything a user needs to write specs, run tests, view
results, and manage their team is in the web app. See `webapp.md` for full feature list.

### API Server

**Technology:** Node.js + Express (or Next.js API routes)

The central hub. Handles:
- Authentication (JWT or session-based)
- CRUD for projects, specs, runs, results
- Queueing test runs and dispatching to the execution engine
- Serving results and screenshots to the frontend
- Webhook dispatch for integrations (GitHub, Slack)
- WebSocket connections for real-time run streaming

### Execution Engine

**Technology:** Node.js + TypeScript + Playwright

The core of the product. Takes a parsed `.axtest` spec and executes it against a browser.
Composed of four layers:

1. **Parser** — reads `.axtest` files and produces a typed AST (Abstract Syntax Tree)
2. **Resolver** — loads AUTH and MODULE dependencies, resolves DEPENDS ON, builds the execution plan
3. **Playwright Executor** — maps each AST action to a Playwright call, handles element resolution
4. **Reporter** — collects step results, captures screenshots on failure, produces structured output

The engine is the same code whether triggered by the web app, the CLI, or the local agent.
It is a Node.js module that takes a spec and returns results.

**Element Resolution Order (no data-testid required):**
1. Visible button/link text
2. `aria-label` attribute
3. Form `label` association
4. `placeholder` attribute
5. `title` attribute

### Database

**Technology:** SQLite (development and small deployments) → PostgreSQL (production SaaS)

Stores:
- Projects and settings
- Spec files (content + version history)
- Run records (metadata, status, duration)
- Step results (per-step pass/fail, error messages)
- Screenshots (file paths or blob references)
- Users, teams, roles
- Encrypted secrets (credentials for auth flows)
- API keys

### CLI

**Technology:** Node.js + Commander

See `cli.md` for full command reference. The CLI operates in two modes:
- **Local mode** — runs the execution engine directly on the developer's machine. No API call.
  Results are written to a local `results/` folder.
- **Cloud mode** (`--cloud` flag or `axtest run` after `axtest login`) — submits the run to
  the API server. Results are stored in the cloud and streamed back to the terminal.

---

## Data Flow: Web App Test Run

```
User clicks "Run" in web app
        ↓
API creates a Run record (status: QUEUED)
        ↓
API dispatches job to execution worker
        ↓
Worker loads spec from database
Worker resolves AUTH + MODULE dependencies
Worker launches Playwright (headless browser)
        ↓
For each step:
  Worker executes Playwright action
  Worker emits step result via WebSocket
  Frontend receives result → updates live feed
        ↓
Run completes
Worker saves all results + screenshots to database
Run record updated (status: PASSED / FAILED)
        ↓
Frontend shows final summary
Integrations fire (Slack, GitHub, webhooks)
```

## Data Flow: CLI Local Run

```
Developer runs: axtest run tests/budgeting/module-05.axtest
        ↓
CLI invokes execution engine directly (no network call)
Engine reads .axtest file from disk
Engine resolves AUTH + MODULE from local files
Engine launches Playwright locally
        ↓
For each step:
  Playwright executes action in local browser
  Step result printed to terminal in real time
        ↓
Run completes
Results written to local results/ folder
Screenshots saved locally
Exit code: 0 (all passed) or 1 (any failed)
```

---

## Security Considerations

**Credentials in auth flows:**
- Auth files use `{{variable}}` syntax — actual credentials are never stored in spec files
- Credentials are stored in an encrypted secrets vault per project
- Secrets are injected at runtime and never logged or displayed after initial save
- Secrets are never included in exported specs or result reports

**API keys:**
- CLI uses a project-scoped API key stored in `~/.axtest/config`
- API keys can be rotated or revoked from the web app
- CI/CD uses short-lived keys or environment variable injection

**Spec isolation:**
- Each test run executes in an isolated browser context (fresh cookies, fresh storage)
- No cross-run state bleed

---

## Technology Stack Summary

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Next.js | Component ecosystem, SSR for fast initial load |
| API | Node.js + Express | Same language as engine, easy to share types |
| Execution Engine | Node.js + TypeScript | Playwright is Node-native, strong typing |
| Browser Automation | Playwright | Best-in-class reliability, cross-browser, TypeScript-first |
| Parsing / Validation | Zod | Schema validation with TypeScript inference |
| Database | SQLite → PostgreSQL | SQLite for simplicity early on, Postgres for scale |
| Real-time | WebSockets (ws / Socket.io) | Live step streaming during runs |
| CLI | Commander | Lightweight, widely used Node CLI framework |
| Secrets | AES-256 encryption at rest | Industry standard |
