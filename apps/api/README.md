# Backend development

The API owns PostgreSQL persistence; the Node worker in `packages/core` owns parsing and Playwright execution. The web application has not yet been switched from its mock API.

## Start locally

Prerequisites: .NET 9 SDK, Node.js 20 or newer, pnpm, and a PostgreSQL connection.

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @axtest/core build
$env:PLAYWRIGHT_SKIP_BROWSER_GC = "1"
pnpm --filter @axtest/core exec playwright install chromium --only-shell
dotnet run --project apps/api
```

For future schema changes, run `dotnet tool restore` at the repository root; the checked-in tool manifest pins EF tooling to the API version.

The default launch profile uses `http://localhost:5000`, matching the frontend's default API URL. Startup applies checked-in EF migrations. `ConnectionStrings:DefaultConnection` is supported, with `ConnectionStrings:Default` as a fallback. Prefer an environment variable such as `ConnectionStrings__DefaultConnection` when configuring another machine; do not copy credentials into examples.

`DevelopmentAuth:Enabled` supplies a fixed developer identity and seeds one development workspace. It accepts only loopback requests and refuses to start outside the Development environment. `GET /api/dev/session` returns that identity in the frontend's existing auth-response shape. This bypass concerns axtest itself; AUTH flows against applications under test still execute their login steps and assertions.

## Frontend contracts

The existing `apps/web/src/lib/api/real.ts` routes are implemented: workspaces/projects, environments, explorer, file/folder create/save/rename/move/delete, test generation, tutorial fork/reset, run submission, and run history/detail. Project DTOs use `runCount` and `systemCount`.

- `POST /api/projects/{id}/runs/file` normally waits for a completed `RunDetail`, preserving the current editor contract. If the queue wait exceeds the bounded wait window it returns HTTP 202 with the current detail instead.
- Add `?wait=false` to receive HTTP 202 immediately. Poll `GET /api/projects/{id}/runs/{runId}` until `status` is `passed` or `failed`; the Location header identifies the resource.
- A selected test includes its prerequisites. Missing/circular dependencies and invalid specs return errors rather than a successful empty run.
- Results include optional `steps`, `skipReason`, and `screenshotUrl`; run responses include optional `errorMessage`. Resolve screenshot URLs against the API origin. Infrastructure failures are failed runs, not passing empty results.
- File saves update content only. Rename and move have dedicated endpoints. Files/folders share a project-scoped namespace; paths cannot traverse parents. Root `auth` and `modules` folders are protected.
- Generation returns draft content for review without saving it. Explicit stable test IDs are preferred; a single unambiguous seed without saved IDs is supported. The browser-safe `@axtest/core/authoring` export is ready for the frontend to adopt during integration.
- Generation variants are suggestions, not evidence that a rule was tested. Rules inform generation; STEPS and ASSERT determine actual outcomes.

## Runner operation

Jobs and their source/environment snapshots are persisted before execution. One worker processes the local queue. Fresh browser contexts isolate tests. Worker subprocesses have a bounded runtime and a reduced environment; on interruption, running jobs are marked failed without automatic replay. A local lock prevents two workers from owning the same artifact directory. This is a single API/worker deployment, not a distributed queue.

Artifacts live in the ignored `apps/api/.runs` directory and are served through project-authorized endpoints. Deleting a project removes its artifacts; projects with active runs cannot be deleted. Preserve this directory if run screenshots must survive a deployment.

Optional settings: `Runner:Enabled`, `Runner:NodePath`, `Runner:WorkerPath`, `Runner:ArtifactRoot`, `Runner:TimeoutSeconds` (5–300, default 120), and `Runner:BrowserExecutablePath`. Defaults work from the repository after the core build and Playwright install. A separately published API must include the Node worker and its dependencies, or set WorkerPath to their installed location.

Browser execution is intentionally restricted to local Development. Public hosting requires worker network/filesystem isolation and real axtest authentication before execution can be enabled there. A server-local environment means an application reachable from the runner machine; it does not provide access to a remote user's localhost.

The legacy `count_decreases` assertion now fails explicitly rather than silently passing. Use an explicit count until before/after baselines are implemented. Unknown scopes and missing assertion targets fail instead of matching unrelated page content.

Tutorial templates mirror the prototype; their example TaskFlow host is not a bundled live application. Configure a reachable application and suitable credentials before running them.

## Verification

With the API and fixture app running:

```powershell
node tests/fixtures/serve.js
python tests/backend_smoke.py http://127.0.0.1:5000
```

`tests/backend_lifecycle.py` starts its own API on port 5199 to verify process timeout, restart persistence, interruption recovery, and the production bypass guard. Stop another worker using the same artifact directory before running it. Both scripts create uniquely named verification projects and delete only those projects afterward.

```powershell
python tests/backend_lifecycle.py
pnpm --filter @axtest/core test
node tests/worker_protocol.cjs
```

Frontend integration remains a separate step: initialize the development session, disable mock mode, adopt shared authoring utilities, handle HTTP 202/polling and error messages, and render artifact links.
