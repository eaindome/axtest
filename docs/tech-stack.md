# axtest — Tech Stack

---

## Monorepo Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 9.x | Package manager — workspaces, fast installs, efficient disk |
| Turborepo | 2.x | Build orchestration — caching, correct build order, parallel tasks |
| TypeScript | 5.x (strict) | Language across all packages |
| tsup | 8.x | TypeScript bundler (wraps esbuild) — used for packages/apps |
| ESLint + Prettier | latest | Linting and formatting |

---

## packages/core (Execution Engine)

| Tool | Purpose |
|------|---------|
| playwright | Browser automation — core library (not the test runner) |
| zod | Schema validation for parsed specs and config |
| vitest | Unit tests for the engine |

---

## apps/cli

| Tool | Purpose |
|------|---------|
| commander | Command parsing and routing |
| chalk | Terminal colours |
| ora | Spinner / loading states |
| enquirer | Interactive prompts (used in `axtest init`) |
| dotenv | .env file loading |

---

## apps/api (Phase 2)

| Tool | Purpose | Note |
|------|---------|------|
| hono | HTTP framework | TypeScript-first, faster than Express |
| drizzle-orm | Database ORM | Lightweight, SQL-first, TypeScript-native |
| better-sqlite3 | SQLite driver | Dev/small deployments |
| pg | PostgreSQL driver | Production SaaS |
| pg-boss | Job queue | Postgres-backed — no Redis needed |
| ws | WebSockets | Live run result streaming |
| jose | JWT auth | Standards-compliant |

---

## apps/web (Phase 3)

| Tool | Purpose | Note |
|------|---------|------|
| Next.js 15 | Frontend framework | App Router |
| Tailwind CSS v4 | Styling | Utility-first |
| shadcn/ui | Component library | Built on Radix UI |
| @monaco-editor/react | Code editor | Same engine as VS Code |
| @tanstack/react-query | Server state | Data fetching, caching |
| zustand | Client state | Lightweight, no boilerplate |
| react-hook-form + zod | Forms | Schema-validated, type-safe |
| recharts | Charts | Pass/fail trends |
| lucide-react | Icons | Ships with shadcn |

---

## Key Decisions and Reasons

**pnpm over npm/yarn:** Workspace support is first-class, installs are faster, and disk
usage is significantly lower via content-addressable storage. Important for a monorepo.

**Turborepo over Nx:** Less configuration overhead for our repo size. Turborepo's task
pipeline (build core before cli) and caching are exactly what we need without the
complexity of a full Nx workspace.

**playwright (core library) over @playwright/test:** axtest IS the test runner. We don't
want Playwright's test runner infrastructure — just its browser automation APIs.
`playwright` gives us `chromium.launch()`, `Page`, `Locator` without the test runner overhead.

**Hono over Express:** TypeScript-first, ~10x faster in benchmarks, cleaner middleware
model. No reason to use Express for a new project in 2025.

**Drizzle over Prisma:** Drizzle is SQL-first — you write SQL-like queries, not a query
language on top of SQL. Much lighter bundle, no Rust engine dependency, better for
understanding exactly what queries are executing. Prisma is fine but adds complexity we
don't need.

**pg-boss over BullMQ/Redis:** pg-boss is a job queue that runs on top of Postgres.
Since we already have Postgres, this means zero additional infrastructure (no Redis).
For our workload (test run jobs, not millions of events per second), it's more than sufficient.

**SQLite → Postgres migration path:** SQLite for local dev and small self-hosted deployments.
Drizzle supports both with the same schema — switching is a config change plus a migration.
