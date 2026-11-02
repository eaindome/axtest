# Tests to keep in version control

Commit reusable Python and browser integration scripts, worker protocol checks, and the self-test specifications, installer, and documentation in `self/`. They verify application behavior and should travel with the corresponding application changes.

Generated screenshots, results, reports, logs, Python caches, and `.tools/` probes are ignored. Never commit credentials, local settings, `.env` files, or browser session state. Verification scripts use disposable accounts or prompt for credentials instead of embedding workspace passwords.

Useful checks:

- `node tests/configuration_guided.cjs`: real application configuration and account verification.
- `node tests/project_workspace.cjs`: project lifecycle and permissions.
- `node tests/frontend_project_list.cjs` and `node tests/frontend_project_pagination.cjs`: list interactions and layout.
- `python tests/suite_security.py`: saved-account privacy and atomic suite execution.
- `node tests/suites_authoring.cjs`: guided suite authoring, search-scoped selection, prerequisite previews and run readiness in mock mode.
- `node tests/suites_authoring_api.cjs`: real authoring, save conflicts, advanced source preservation and execution against a disposable todo fixture.
- `node tests/worker_protocol.cjs`: worker validation and execution protocol.

Start the API on localhost:5000 and frontend on localhost:5173 for live integration checks. Build `@axtest/core` after worker source changes. The self-test walkthrough is in `self/README.md`.
