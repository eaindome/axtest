# Frontend integration

## Suite workspace

Open **Projects**, then select the application. Projects open on **Configuration**, followed by **Test suites** and **Run history**. Existing `/suites?project=…` links redirect to the project suite workspace. Each saved file containing TEST cases is a suite; reusable AUTH/MODULE flows are excluded from selection. Select individual tests or whole suites. The workspace remembers the project, environment, per-environment account choices and test selection for the signed-in user and data mode. Edit links open the existing authoring tools.

**Configuration** configures the selected URL and saves named test accounts. API-mode values are encrypted at rest using ASP.NET Data Protection and are never returned to the frontend. Local storage contains only account IDs, selections and run metadata. Accounts are bound to the project, environment and URL. After changing a URL, save a new account for it. Mock accounts remain session-only metadata.

Suites organises selection, readiness and combined results. New suite opens an unsaved draft in the full editor; naming it and writing its first behaviour happen together. Add test and Edit open the relevant suite/test in that same editor. Back to suites restores search, selection and results. The editor shares the environment and saved account, saves changes before running, and labels its actions Run this suite and Run this test. Grouped advanced syntax opens in Code to preserve its flow. Opening a suite does not select it. Lists render eight suites and ten tests per page in bounded scroll areas. Suite bulk actions select only the current suite page; test bulk actions select only the current test page. Search resets paging and keeps existing selections, including hidden matches. Test names open a read-only preview; grouped tests show source to preserve execution order. Row results reflect the latest batch in this workspace. Pagination bounds rendering; the explorer API still loads project sources together.

**Run selected** submits the selection as one validated batch. A readiness summary explains missing setup or inputs before submission, and the execution plan lists included prerequisites. Saved accounts provide credentials; other inputs can be entered for the current visit without persisting them in browser storage. `AXTEST_CASE` gets a fresh value per suite run. The results card shows the last submitted batch, including prerequisites, with ten test results per page, status filters and search. Changing the current selection does not alter that batch. Result filters and pages survive editor visits; a new submission resets them. Errors, steps and available screenshots remain attached to each result. **Rerun failed** selects failed tests and includes their prerequisites. Refresh resumes polling submitted IDs. Use **Run settings** beside Run in Suites or the editor to choose headless or visible Chromium and Fast (0 ms), Standard (400 ms), or Slow (1 second) pacing. Preferences are shared per project/user/data mode and survive refresh. Visible pacing is ignored for headless runs; short visible tests stay open for at least four seconds. Interactive debugging is not implemented.

Projects can be archived from their actions menu. Archived projects are hidden from the Active list, retain their data, and reject new runs. The Archived filter offers Restore and confirmed permanent deletion.

Verification: `node tests/project_workspace.cjs` covers configuration, account handoff and project lifecycle. `node tests/suites_authoring.cjs` covers connected editor navigation, draft saves, toasts and context restoration in mock mode; `node tests/suites_authoring_api.cjs` verifies real authoring, save conflicts, source preservation and dependency execution against a todo fixture. `node tests/suite_workspace.cjs` covers saved setup, batch execution, refresh, evidence, reruns and mock isolation. `python tests/suite_security.py` covers account isolation and atomic batch validation.

The data switch in development selects **Mock** or **API** mode. Its choice survives refreshes. Mock mode uses the local demo data; API mode uses the ASP.NET backend and PostgreSQL. Switching mode reloads the workspace, and authentication, workspace selection, and tutorial state are stored separately for each mode.

Routine save confirmations and action failures use dismissible toasts. Field validation, configuration checks, readiness blockers and test failures remain in context.

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

## Guided project configuration

Configuration is organized into address, application access, and verification. Use the shared custom dropdowns to choose an environment and whether login is required. Public applications do not need credentials. For protected applications, add or edit a saved test account, choose a shared default, and select or build a reusable login flow. The guided builder stores placeholders, never passwords, in `auth/login-{environment}.axtest`. Suites explicitly reference the flow through their authentication setting.

Connection checks and login checks use the real API computer and are unavailable in mock mode. Saved configuration and successful checks are labelled separately; check results are valid only for the current page session. Unsaved address, account, and flow edits are protected when navigating or switching environment/workspace. Failed saves preserve input. Empty credential fields during account editing keep existing secrets; changing the target address requires re-entering saved inputs. Additional account inputs are optional, not inferred from every test's variables.

`node tests/configuration_guided.cjs` runs the real access checks against a disposable login application and verifies secret privacy, account updates, shared defaults, navigation guards, failed-save recovery, and permission isolation.

Account creation and editing use the shared side drawer, with guarded dismissal, keyboard focus containment, and input preservation after failed saves. Step 3 shows a saved-setup summary beside verification controls. The account chosen for a login check is independent of the suite default, initially prefilling that default. Verification results name the account and check time, and clear when the address, login flow, account selection, credentials, or related drafts change. Public applications use the same area for connection verification.
