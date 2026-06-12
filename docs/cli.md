# axtest CLI

---

## Overview

The axtest CLI serves two purposes:

1. **Local development** — run tests on your machine against any URL, including `localhost`,
   without needing a cloud account or internet connection.

2. **CI/CD integration** — trigger test runs in GitHub Actions, GitLab CI, or any pipeline.
   Results are stored in axtest cloud and posted back to the PR/branch.

The CLI is not the primary product. It is the power-user and automation entry point.
The web application is the primary interface.

---

## Installation

```bash
npm install -g axtest
# or
npx axtest
```

---

## Two Modes

**Local mode** (default when not logged in):
Runs the execution engine directly on your machine. Playwright must be installed locally.
Results are written to a local `results/` folder. No network call to axtest cloud.

**Cloud mode** (after `axtest login`):
Submits runs to the axtest cloud. Results are stored in the dashboard and streamed back
to the terminal in real time. Requires a public URL (or local agent for private apps).

---

## Commands

### Project Setup

```bash
axtest init
```
Scaffold a new axtest project in the current directory. Creates:
- `axtest.config` — base URL, browser, timeout settings
- `auth/` folder with an example auth file
- `modules/` folder with an example module file
- `tests/` folder with an example test file
- `.env.example` — template for environment variables

```bash
axtest login
```
Authenticate with axtest cloud. Opens a browser to complete OAuth login.
Saves an API key to `~/.axtest/config`.

```bash
axtest logout
```
Remove the saved API key.

```bash
axtest whoami
```
Print the currently authenticated user, project name, and environment.

---

### Spec Management

```bash
axtest validate
```
Parse and validate all `.axtest` files in the project. Reports syntax errors, unknown
actions, unclosed blocks, missing AUTH/MODULE references. Does not run any tests.
Exit code 0 if valid, 1 if any errors found.

```bash
axtest validate tests/budgeting/module-05.axtest
```
Validate a specific file or folder.

```bash
axtest push
```
Upload all local `.axtest` files to the connected cloud project. Overwrites cloud
versions with local versions. Use before triggering a cloud run from CI.

```bash
axtest pull
```
Download cloud specs to the local project directory. Useful for syncing changes made
in the web editor to a local repo.

```bash
axtest diff
```
Show a diff of what has changed between local specs and cloud specs. Does not push or pull.

---

### Running Tests

```bash
axtest run
```
Run all tests in the `tests/` folder. Uses local mode by default.

```bash
axtest run tests/budgeting/module-05.axtest
```
Run a specific file.

```bash
axtest run tests/budgeting/
```
Run all tests in a folder.

```bash
axtest run --test P-01
```
Run a specific test by its ID within any file.

```bash
axtest run --env staging
```
Run against a named environment defined in `axtest.config`. Overrides the base URL
and any environment-specific variables.

```bash
axtest run --var fiscal_cycle="2025/2026" --var username=admin@example.com
```
Pass variables at run time. Overrides `.env` file values for this run only.

```bash
axtest run --cloud
```
Run via the axtest cloud runner instead of locally. Requires `axtest login` and a
publicly accessible base URL.

```bash
axtest run --reporter json
```
Output format. Options: `text` (default, human-readable terminal output),
`json` (machine-readable, for CI parsing), `junit` (for CI systems that consume JUnit XML).

```bash
axtest run --bail
```
Stop after the first failed test instead of continuing.

```bash
axtest run --headed
```
Run with a visible browser window (local mode only). Useful for debugging a failing test.

---

### Local Agent

The local agent allows cloud-triggered runs to execute on your machine. Used for testing
apps that are not publicly accessible (localhost, internal staging behind a VPN).

```bash
axtest agent start
```
Start the local agent. The agent connects to axtest cloud via a secure tunnel.
Runs triggered from the web app or CI will execute locally via this agent.
Keep this running in the background (or as a system service).

```bash
axtest agent status
```
Show whether the agent is running and connected to the cloud.

```bash
axtest agent stop
```
Stop the local agent.

---

### Utilities

```bash
axtest results
```
Print a summary of the most recent run in the terminal.

```bash
axtest open
```
Open the axtest web dashboard for the current project in the default browser.

```bash
axtest config set BASE_URL https://staging.myapp.com
```
Update a value in `axtest.config`.

```bash
axtest config get BASE_URL
```
Print a config value.

---

## What the CLI Does NOT Do

- Manage team members or user accounts (web app only)
- Manage billing or plan upgrades (web app only)
- Create or manage encrypted secrets/credentials (web app only — secrets are referenced
  as `{{variable}}` in specs; their values live in the cloud vault)
- Render the results dashboard or trend charts (terminal output is text only)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: axtest

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install axtest
        run: npm install -g axtest

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run tests
        run: axtest run --reporter junit --env staging
        env:
          AXTEST_API_KEY: ${{ secrets.AXTEST_API_KEY }}
          USERNAME: ${{ secrets.TEST_USERNAME }}
          PASSWORD: ${{ secrets.TEST_PASSWORD }}

      - name: Publish results
        uses: actions/upload-artifact@v3
        with:
          name: axtest-results
          path: results/
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | One or more tests failed |
| `2` | Spec validation error (malformed .axtest file) |
| `3` | Configuration error (missing base URL, bad API key, etc.) |

---

## Environment Variables

The CLI reads from a `.env` file in the project root and from shell environment variables.
Shell variables take precedence over `.env` file values.

```bash
# .env
BASE_URL=https://staging.myapp.com
USERNAME=admin@example.com
PASSWORD=secret123
FISCAL_CYCLE=2025/2026
```

Variables are referenced in specs as `{{VARIABLE_NAME}}` (case-insensitive).
