# Run axtest against itself

Use **API mode** throughout. Mock results are simulations and do not establish that the system works.

## Recommended suite workflow

Open **Projects**, then **axtest Self Test**. In **Configuration**, set the selected environment URL to `http://localhost:5173` and save a named account using the target application's username and password. Open **Test suites** and select the Authentication and Workspace suite checkboxes. A dedicated test account keeps disposable projects out of your regular workspace. Account values are encrypted on the API; only the account choice is kept in browser preferences.

Choose **Run selected** for the six passing cases. The readiness summary explains missing configuration, and the execution plan lists any included prerequisites. There is no per-run credentials dialog. Case names are generated uniquely by the runner. The result panel combines both suites, restores after refresh, and offers **Rerun failed** when appropriate. Select Evidence separately to verify its intentional failure and screenshot. An account selected for a public test does not suppress that test's evidence when no credentials are used.

The environment, account choice and selection are remembered. Use **New suite** and **Add test** for guided authoring, **Edit** for supported simple tests, and **Advanced editor** for grouped flows or source changes. Watch, breakpoints, pausing and stepping are not available in this workspace yet. The editor walkthrough below remains available for isolated file runs, including its existing browser display option.

## Prepare

Start the API at `http://localhost:5000` and frontend at `http://localhost:5173`. Build the worker after source changes with `pnpm --filter @axtest/core build`.

Run `python tests/self/setup.py` from the repository root. Enter your workspace username and password when prompted. It creates **axtest Self Test**, configures its URL and installs the specs. It preserves existing projects and file edits, writes no password into the project, and prints a direct editor link.

For manual setup, create that project on Projects with Production URL `http://localhost:5173`. Copy the files into their matching `auth/` and `modules/` folders. Copy `controls/evidence.axtest` into `modules/evidence.axtest`. Select Production in the editor, or configure Staging to that same URL. The runner reaches this address from the API machine.

## Editor walkthrough

1. Open `modules/authentication.axtest` and select **Run**. A centered **Run options** dialog appears. Enter `AXTEST_USERNAME` and `AXTEST_PASSWORD` in **Run inputs**, optionally select **Show browser during this run**, then select **Start run**. Expect **4/4 passed**: protected-page redirect, invalid credentials, valid login/project navigation and logout. Invalid login uses a nonexistent account, preserving your real account's lockout budget.
2. Open `modules/workspace.axtest` and run it. Enter the same credentials and keep the generated `AXTEST_CASE`, or choose a unique value. Expect **2/2 passed**: create a project and its first file, then open password settings. Each test signs in through `auth/self-login.axtest`. A dedicated test account keeps these disposable projects out of your normal workspace.
3. Open `modules/evidence.axtest`, choose **Run**, then **Start run** in the options dialog. It needs no inputs and deliberately checks for nonexistent text. Expect **0/1 passed**, an explicit failed assertion and **View screenshot**. This is a control proving that failures and evidence work; exclude it from the passing suite's health.
4. Open the self-test project's run history. Verify both passing runs and the intentional failed run. Refresh and reopen the evidence to confirm persistence.

Select **Reuse inputs in this tab** when starting a run to reuse credentials across files in the same project and environment. They remain in tab memory, scoped to the signed-in user and workspace, and are cleared on refresh, sign-out or changing user. **Clear remembered inputs** clears that scope immediately. `AXTEST_CASE` is always generated fresh. Values are never stored in localStorage, sessionStorage, files, queue snapshots or history. The API holds a submitted run's inputs in process memory until the worker claims it and redacts them from textual output. Screenshots are disabled for runs with inputs. If the API restarts before claiming a queued run, resubmit it. Never paste a real password into a spec or assertion.

Each test gets a fresh browser context. A test's logout does not sign out your interactive browser. API mode is selected explicitly in the login steps.

The environment selector chooses which URL the runner uses. Choose **Production**, **Staging** or **Local**, then select the adjacent **Edit URL** / **Set URL** button. Production updates the project's base URL; Staging and Local save separate project environment URLs or can explicitly reuse Production. These controls remain visible on narrower screens. For testing axtest on this machine, set the selected URL to `http://localhost:5173`.

With **Show browser** off, Chromium runs headlessly. Select the checkbox and then click **Start run** to launch it; checking the box alone does not start execution. It opens maximized on the API machine with slower steps, and short visible tests remain open for at least four seconds. This is a local desktop window, not a live stream embedded in the editor; a remote API cannot open a window on your laptop. The browser closes when the run finishes.

## Manual checks

These remain guided checks because submitting another browser run from inside the single local worker would queue work behind itself.

1. Open the disposable `Self test <AXTEST_CASE>` project and its `self-created.axtest`. Add a login-page test, save, refresh and confirm the source remains.
2. Edit without saving, try switching Mock/API, and cancel. Confirm your text remains. Accept a second switch and verify identities and project lists stay separate.
3. Return to the self-test project in API mode. Run the evidence control, open its screenshot, then find the same result in history.
4. With a disposable account in two browser profiles, change its password in Settings. Refresh the second session and confirm login is required. Verify the new password works. Do not automate changes to the owner password.
5. Remove only disposable `Self test <AXTEST_CASE>` projects you recognize. The installer never deletes existing data.

For unexpected failures, record the spec/test ID, run ID, API/mock mode, environment, expected and actual behavior, failing step and screenshot when available. Re-run once to check repeatability. Keep intentional control failures separate.

## CLI and independent checks

Build the CLI with `pnpm --dir apps/cli build`, then run `node tests/selftest.cjs`. Supply one JSON line on stdin with `username` and `password`. It runs the six passing tests, supplies a unique case value, and redacts the password from console output. It excludes `controls/`. Prefer editor inputs for interactive use so shell history contains no credentials.

`python tests/auth_security.py` checks cookies, CSRF, lockout, session revocation and tenant/role isolation independently. `node tests/frontend_auth.cjs`, `node tests/frontend_modes.cjs` and `node tests/frontend_integration.cjs` cover password changes, unsaved-change guards and editor execution. The latter needs `node tests/fixtures/serve.js`. Public execution remains blocked until runner network/filesystem isolation is implemented.
