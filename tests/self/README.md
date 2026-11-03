# Run axtest against itself

Use **API mode** throughout. Mock results are simulations and do not establish that the system works.

## Recommended suite workflow

Open **Projects**, then **axtest Self Test**. In **Configuration**, set the selected environment URL to `http://localhost:5173` and save a named account using the target application's username and password. Open **Test suites** and select the Authentication and Workspace suite checkboxes. A dedicated test account keeps disposable projects out of your regular workspace. Account values are encrypted on the API; only the account choice is kept in browser preferences.

Choose **Run selected** for the six passing cases. The readiness summary explains missing configuration, and the execution plan lists any included prerequisites. There is no per-run credentials dialog. Case names are generated uniquely by the runner. The result panel combines both suites, restores after refresh, and offers **Rerun failed** when appropriate. Select Evidence separately to verify its intentional failure and screenshot. An account selected for a public test does not suppress that test's evidence when no credentials are used.

The environment, account choice and selection are remembered. Use **New suite**, **Add test**, **Edit in editor** or **Open editor** to author in the full editor. **Back to suites** restores the execution workspace. The editor shares the environment/account and offers **Run this suite** or **Run this test**; it saves edits before execution. Grouped advanced flows open in Code. Watch, breakpoints, pausing and stepping are not available in this workspace yet. The editor walkthrough below remains available for isolated file runs, including shared Run settings.

## Prepare

Start the API at `http://localhost:5000` and frontend at `http://localhost:5173`. Build the worker after source changes with `pnpm --filter @axtest/core build`.

Run `python tests/self/setup.py` from the repository root. Enter your workspace username and password when prompted. It creates **axtest Self Test**, configures its URL and installs the specs. It preserves existing projects and file edits, writes no password into the project, and prints a direct editor link.

For manual setup, create that project on Projects with Production URL `http://localhost:5173`. Copy the files into their matching `auth/` and `modules/` folders. Copy `controls/evidence.axtest` into `modules/evidence.axtest`. Select Production in the editor, or configure Staging to that same URL. The runner reaches this address from the API machine.

## Editor walkthrough

1. Open `modules/authentication.axtest` in the editor. Select Production and the saved account configured above, then **Run this suite**. Expect **4/4 passed**: protected-page redirect, invalid credentials, valid login/project navigation and logout. Invalid login uses a nonexistent account, preserving your real account's lockout budget.
2. Open `modules/workspace.axtest` and select **Run this suite**. The same environment/account is reused and `AXTEST_CASE` is generated automatically. Expect **2/2 passed**: create a project and its first suite through the full editor, then open password settings. Each test signs in through `auth/self-login.axtest`. A dedicated test account keeps disposable projects out of your normal workspace.
3. Open `modules/evidence.axtest` and select **Run this suite**. It needs no account inputs and deliberately checks for nonexistent text. Expect **0/1 passed**, an explicit failed assertion and **View screenshot**. This proves failures and evidence work; exclude it from the passing suite's health.
4. Open the project's run history. Verify the passing runs and intentional failed run. Refresh and reopen evidence to confirm persistence.

Save credentials once in Configuration and choose that account in either Suites or the editor. Account IDs and execution preferences are remembered; passwords are never returned to the frontend. Other runtime values are prompted only when needed and remain in tab memory. The API holds submitted run inputs in process memory until the worker claims them and redacts them from output. Screenshots are disabled when sensitive inputs are used. If the API restarts before claiming a queued run, resubmit it. Never paste a real password into a spec or assertion.

Each test gets a fresh browser context. A test's logout does not sign out your interactive browser. API mode is selected explicitly in the login steps.

The environment selector chooses the runner's URL. Configure Production, Staging and Local in the project's **Configuration** tab. For testing axtest on this machine, use `http://localhost:5173`.

Open **Run settings** in the Suites selection bar, or expand **Run setup** in the editor to find it. With **Show browser** off, Chromium runs headlessly. Enable it to watch execution, then choose Fast, Standard or Slow pacing before running. These preferences are shared between both views. It opens on the API computer, not as a live stream inside the editor, and closes when the run finishes.

## Manual checks

These remain guided checks because submitting another browser run from inside the single local worker would queue work behind itself.

1. Open the disposable `Self test <AXTEST_CASE>` project and its newly created suite. Add a login-page test, save, refresh and confirm the source remains.
2. Edit without saving, try switching Mock/API, and cancel. Confirm your text remains. Accept a second switch and verify identities and project lists stay separate.
3. Return to the self-test project in API mode. Run the evidence control, open its screenshot, then find the same result in history.
4. With a disposable account in two browser profiles, change its password in Settings. Refresh the second session and confirm login is required. Verify the new password works. Do not automate changes to the owner password.
5. Remove only disposable `Self test <AXTEST_CASE>` projects you recognize. The installer never deletes existing data.

For unexpected failures, record the spec/test ID, run ID, API/mock mode, environment, expected and actual behavior, failing step and screenshot when available. Re-run once to check repeatability. Keep intentional control failures separate.

## CLI and independent checks

Build the CLI with `pnpm --dir apps/cli build`, then run `node tests/selftest.cjs`. Supply one JSON line on stdin with `username` and `password`. It runs the six passing tests, supplies a unique case value, and redacts the password from console output. It excludes `controls/`. Prefer saved test accounts in the editor for interactive use so shell history contains no credentials.

`python tests/auth_security.py` checks cookies, CSRF, lockout, session revocation and tenant/role isolation independently. `node tests/frontend_auth.cjs`, `node tests/frontend_modes.cjs` and `node tests/frontend_integration.cjs` cover password changes, unsaved-change guards and editor execution. The latter needs `node tests/fixtures/serve.js`. Public execution remains blocked until runner network/filesystem isolation is implemented.
