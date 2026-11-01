# Frontend integration

## Suite workspace

Open **Projects**, then select the application. Projects open on **Configuration**, followed by **Test suites** and **Run history**. Existing `/suites?project=…` links redirect to the project suite workspace. Each saved file containing TEST cases is a suite; reusable AUTH/MODULE flows are excluded from selection. Select individual tests or whole suites. The workspace remembers the project, environment, per-environment account choices and test selection for the signed-in user and data mode. Edit links open the existing authoring tools.

**Configuration** configures the selected URL and saves named test accounts. API-mode values are encrypted at rest using ASP.NET Data Protection and are never returned to the frontend. Local storage contains only account IDs, selections and run metadata. Accounts are bound to the project, environment and URL. After changing a URL, save a new account for it. Mock accounts remain session-only metadata.

**Run selected** submits all chosen files as one validated batch; **Watch selected** uses visible Chromium on the API computer. No per-run credential dialog is required. Required dependencies are included, and `AXTEST_CASE` gets a fresh value per suite run. Results, errors, steps and available screenshots appear beside the selection. **Rerun failed** selects failed tests and includes their prerequisites. Refresh resumes polling the submitted IDs, and leaving the page does not stop the queued jobs. **Debug** is deliberately unavailable until breakpoint/pause/step controls are implemented.

Projects can be archived from their actions menu. Archived projects are hidden from the Active list, retain their data, and reject new runs. The Archived filter offers Restore and confirmed permanent deletion.

Verification: `node tests/project_workspace.cjs` covers the real API configuration, account handoff, archive/restore/deletion, and role/tenant isolation. `node tests/suite_workspace.cjs` covers saved setup, selection, multi-file execution, Watch, refresh, evidence, failed-case reruns and mock isolation. `python tests/suite_security.py` covers API account isolation and atomic batch validation.

The data switch in development selects **Mock** or **API** mode. Its choice survives refreshes. Mock mode uses the local demo data; API mode uses the ASP.NET backend and PostgreSQL. Switching mode reloads the workspace, and authentication, workspace selection, and tutorial state are stored separately for each mode.

## Start

From the repository root, build the shared authoring/runner package first:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @axtest/core build
```

Start the backend and frontend in separate terminals:

```powershell
dotnet run --project apps/api
```

```powershell
pnpm --filter @axtest/web dev
```

Open `http://localhost:5173`. Select API using the data switch. The default API origin is `http://localhost:5000`; override it using `VITE_API_URL` in an ignored `apps/web/.env.local` file if needed. The backend CORS configuration must allow the frontend origin.

API mode restores its HttpOnly cookie session through `/api/auth/session` and requires username/password sign-in. API credentials and session secrets are never stored in localStorage. Select API at login, or open `/login?mode=api`. Sign out revokes the session. Settings includes password changes, which revoke other sessions. An unavailable API displays an error and retry action; it never silently switches to mock data. Mock mode retains its separate simulated identity.

Tests still execute AUTH steps against the application being tested. Set a project production URL or configure staging/local in the editor; the URL must be reachable from the backend runner.

The editor's environment selector has an adjacent, always-visible Edit URL button for Production, Staging and Local. Production edits the project base URL; Staging and Local keep their own URL or explicitly reuse Production. Run opens a centered options dialog, with per-run input values and an optional Show browser checkbox. Visible Chromium opens on the local API machine; headless execution remains the default.

## Runs and evidence

The editor submits runs asynchronously, displays queue/running state, and polls their persisted run resource. Leaving the editor stops browser polling, not a run already queued on the backend. Project run history refreshes while runs are pending or running.

Results display execution errors, skipped reasons, expandable steps, and failure screenshots. Screenshot previews are fetched from the API with the current API session rather than assuming the frontend and API share an origin.

Authoring utilities are re-exported from `@axtest/core/authoring` so generation and serialization are shared with the backend. Mock mode continues to simulate runs; its pass/fail output is demo data.

Unsaved changes are guarded when changing page, workspace, or data mode. A running or saving editor must finish before changing data mode or workspace. Normal navigation away from a running editor is allowed; follow the run in project history.

## Verification

```powershell
pnpm --filter @axtest/web check
pnpm --filter @axtest/web build
```

For the browser integration test, also start `node tests/fixtures/serve.js`, then run:

```powershell
node tests/frontend_integration.cjs
node tests/frontend_modes.cjs
node tests/frontend_auth.cjs
```

The test creates one uniquely named real project and deletes only that project afterward. It exercises API session initialization, project/file creation, saved editor content, real application login and execution, polling, screenshots, run history, independent mock mode, switching back to API, and outage/retry behavior.

The additional mode test verifies that canceling a data-mode switch preserves unsaved text, and accepting it restores the separate mock and API identities. The auth test covers registration validation, username login, refresh, password changes, other-session revocation and sign out. Tests create dedicated random verification accounts; no owner password is stored in tests.
