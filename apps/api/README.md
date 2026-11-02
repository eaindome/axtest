# Backend development

## Saved test accounts and suite runs

`GET/POST /api/projects/{projectId}/test-accounts` lists safe metadata or saves a named target-account profile; DELETE by account GUID removes it. Values are protected using ASP.NET Data Protection with a project/environment/account-specific purpose. Responses never include decrypted values or protected payloads. Preserve the server's Data Protection key ring across deployments; use a protected shared key store for replicas. Trust project writers with the accounts they can execute tests against. Viewer roles cannot modify accounts or submit runs.

`POST /api/projects/{projectId}/runs/batch` accepts an environment, selected files/test names, optional accountId and headed flag. The API validates the full selection, required inputs and scope before adding any jobs. It filters account inputs per suite, generates a fresh AXTEST_CASE when needed, and puts credentials only into the ephemeral run-input vault. Persisted snapshots contain no profile values. All accepted jobs survive page navigation; secret-bearing jobs still require resubmission after an API restart before their input is claimed. Their source and result records remain durable. Browser execution retains the local Development and loopback restrictions.

The `SavedTestAccounts` migration adds only the encrypted-profile table. Existing projects, tests, memberships and runs are preserved.

The API owns PostgreSQL persistence; the Node worker in `packages/core` owns parsing and Playwright execution. The web application preserves its mock/API switch. API mode uses real username/password authentication; see `apps/web/README.md`.

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

The default launch profile uses `http://localhost:5000`, matching the frontend's default API URL. Startup applies checked-in EF migrations. `ConnectionStrings:DefaultConnection` is supported, with `ConnectionStrings:Default` as a fallback. Local settings are loaded from ignored `appsettings.Development.local.json`; environment variables and command-line settings take precedence. Prefer an environment variable such as `ConnectionStrings__DefaultConnection` when configuring another machine; do not copy credentials into tracked files.

For a new checkout, copy `apps/api/appsettings.Development.example.json` to `apps/api/appsettings.Development.local.json` and replace its placeholders locally. Environment-specific settings files, including `appsettings.Development.json`, are ignored; sanitized `*.example.json` files remain trackable. Keep `appsettings.json` limited to non-secret defaults. Adding an ignore rule does not remove a file already tracked by Git; use `git rm --cached` to stop tracking it while keeping the local copy. A committed credential also requires rotation and an assessment of older history and remote copies.

Authentication uses normalized usernames (3–32 letters, digits, underscores, dots or hyphens) and BCrypt cost 12 passwords (12 characters minimum, 72 UTF-8 bytes maximum). API sessions use HttpOnly, SameSite=Strict cookies with an absolute eight-hour expiry and a hashed server-side session record. Logout revokes the session; changing a password revokes all other sessions. Production requires HTTPS and Secure cookies. The frontend and API must be same-site; configure explicit CORS origins. Persist ASP.NET Data Protection keys across production restarts/replicas using the deployment's protected key store.

Get `/api/auth/session` to obtain a CSRF token, then include `X-CSRF-TOKEN` on every mutation, including login and registration. Authentication endpoints are limited to 30 requests per IP per minute; five failed logins lock an account for 15 minutes. Mock mode remains simulated and grants no API access. The development identity bypass has been removed.

For a new installation, run `dotnet run --project apps/api -- --bootstrap-owner` and supply one JSON line on stdin with `username`, `password`, and `name`. Do not pass passwords as command arguments or save them in repository files. Existing usernames are never reset. This explicitly requested bootstrap transfers the former development workspace to the new owner and disables the former development identity. Other migrated accounts receive `legacy_<id>` usernames.

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

Browser execution requires a loopback connection in Development. Public hosting requires worker network/filesystem isolation before execution can be enabled there. Server-worker upload actions are disabled until managed assets are available; local CLI uploads remain available. A server-local environment means an application reachable from the runner machine; it does not provide access to a remote user's localhost.

The legacy `count_decreases` assertion now fails explicitly rather than silently passing. Use an explicit count until before/after baselines are implemented. Unknown scopes and missing assertion targets fail instead of matching unrelated page content.

Tutorial templates mirror the prototype; their example TaskFlow host is not a bundled live application. Configure a reachable application and suitable credentials before running them.

## Verification

With the API and fixture app running:

```powershell
node tests/fixtures/serve.js
python tests/backend_smoke.py http://127.0.0.1:5000
```

`tests/backend_lifecycle.py` starts its own API on port 5199 to verify process timeout, restart persistence, interruption recovery, and rejection of anonymous access. Stop another worker using the same artifact directory before running it. Both scripts create dedicated verification accounts and uniquely named projects; only those projects are deleted afterward.

```powershell
python tests/backend_lifecycle.py
pnpm --filter @axtest/core test
node tests/worker_protocol.cjs
```

Frontend integration uses cookie sessions, shared authoring utilities, HTTP 202/polling and screenshot previews. `python tests/auth_security.py` verifies live authentication, CSRF, revocation, tenant isolation and role restrictions using isolated `authcheck_` accounts. Their dedicated workspaces remain for inspection; verification projects are removed. See `tests/self/README.md` for axtest's own browser suite.

Project lifecycle: projects expose `archivedAt`. POST `api/workspaces/{workspaceId}/projects/{id}/archive` preserves data and rejects active runs; `/restore` reactivates it. Run submission and lifecycle changes serialize on the project row. Archived projects reject new runs, and DELETE requires prior archiving.

Guided setup: GET/PUT `/api/projects/{id}/setup/{environment}` persists whether login is required, the reusable login file, and the default account. Both references are scoped to the project; accounts must match the environment and saved URL. POST `/check-connection` checks the saved address with a 10-second HTTP request and no redirect following. POST `/check-login` runs the selected AUTH flow with the encrypted default account in a transient, headless runner with screenshot suppression. Checks require a local Development connection and write access. They do not create test-history entries or return credentials. PUT `/api/projects/{id}/test-accounts/{accountId}` renames or partially replaces account inputs; unprovided inputs are preserved. URL changes require a complete replacement of existing inputs.

`POST /api/projects/{id}/setup/{environment}/check-login?accountId={id}` verifies a specific saved account without changing the default. The query parameter is optional for existing clients; omission uses the saved default. An explicitly selected account must belong to the same project, environment, and target URL.
