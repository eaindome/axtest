# axtest Language Specification

**Version:** 0.2 (Draft)
**Status:** In Review

---

## Overview

axtest uses `.axtest` files to define browser automation tests. The format is intentionally
readable — a non-developer should be able to read a spec file and understand exactly what is
being tested.

Elements are located by what users actually see: visible text, labels, ARIA attributes, and
placeholders. No `data-testid` or selector knowledge required.

---

## File Types and Project Structure

```
my-project/
├── axtest.config
├── auth/
│   └── standard-login.axtest
├── modules/
│   └── budgeting.axtest
│   └── student-discounts.axtest
└── tests/
    └── budgeting/
    │   └── module-05-budget-creation.axtest
    │   └── module-06-budget-review.axtest
    └── student-discounts/
        └── module-31-discounts-and-writeoffs.axtest
```

**One file per module.** Each file can contain multiple TEST blocks, separated by `---`.

---

## 1. Config File

`axtest.config`

```
BASE_URL    https://app.example.com
BROWSER     chromium
TIMEOUT     10000
SCREENSHOTS on-failure
```

---

## 2. Auth File

Auth files define reusable login flows. They run once per session and are cached.

`auth/standard-login.axtest`

```
AUTH standard-login

STEPS
  navigate to "/login"
  type "admin@example.com" into "Email"
  type "password123" into "Password"
  click "Login"

ASSERT
  "Dashboard" is visible
```

Use variables for credentials:

```
AUTH standard-login

STEPS
  navigate to "/login"
  type "{{username}}" into "Email"
  type "{{password}}" into "Password"
  click "Login"

ASSERT
  "Dashboard" is visible
```

---

## 3. Module File

Module files define reusable navigation steps for a section of the application.
They replace the "Base Procedure" pattern used in manual test sheets.

`modules/budgeting.axtest`

```
MODULE budgeting

STEPS
  click "Budgeting" in sidebar

ASSERT
  "Budgeting" page is visible
  "Board" view is visible
```

`modules/student-discounts.axtest`

```
MODULE student-discounts

STEPS
  click "Student Discounts" in sidebar

ASSERT
  "Pending Discounts" tab is visible
  "Reviewed Discounts" tab is visible
  "Approved Discounts" tab is visible
```

---

## 4. Test File

Each test block corresponds to one test case from a manual test sheet.
Tests in the same file share a module context and run sequentially.

```
AUTH standard-login
MODULE budgeting

---

TEST P-01: Create a new budget with only the required field (Fiscal Cycle)

STEPS
  click "New"
  click tab "Core"
  select first from "Fiscal Cycle"
  click "Save"

ASSERT
  toast shows "Budget created successfully"
  left panel contains "PENDING"
  left panel shows selected fiscal cycle

---

TEST P-02: Create a new budget with all Core fields filled

STEPS
  click "New"
  click tab "Core"
  select first from "Fiscal Cycle"
  type "Annual Subvention 2025/2026" into "Description"
  type "Initial draft for review" into "Initial Comment"
  click "Save"

ASSERT
  toast shows "Budget created successfully"
  left panel contains "Annual Subvention 2025/2026"

---

TEST P-27: Submit a PENDING budget for review

SETUP
  select budget with status "PENDING" from left panel

STEPS
  click "Review" in action bar
  click "Confirm Review"

ASSERT
  toast shows "Budget successfully marked as Reviewed"
  budget status badge equals "REVIEWED"

---

TEST N-01: Attempt to create a budget without selecting a Fiscal Cycle

STEPS
  click "New"
  click tab "Core"
  click "Save"

ASSERT
  form error shows "Financial Period is required"
  modal stays open
```

---

## 5. Full Action Vocabulary

### Navigation

| Action | Example |
|--------|---------|
| `navigate to "path"` | `navigate to "/budgeting"` |
| `go back` | `go back` |
| `refresh page` | `refresh page` |

### Clicking

| Action | Example |
|--------|---------|
| `click "label"` | `click "New"` |
| `click "label" in sidebar` | `click "Budgeting" in sidebar` |
| `click "label" in action bar` | `click "Review" in action bar` |
| `click "label" in row "context"` | `click "Edit" in row "John Smith"` |
| `click tab "label"` | `click tab "Core"` |
| `click "label" in modal` | `click "Save" in modal` |
| `click "label" in breadcrumb` | `click "Budgets" in breadcrumb` |
| `open action menu for "context"` | `open action menu for "John Smith"` |
| `open action menu in first row of "table"` | `open action menu in first row of "Budgeted Fees"` |
| `double click "label"` | `double click "Budget Name"` |
| `right click "label"` | `right click "Row Item"` |

### Typing

| Action | Example |
|--------|---------|
| `type "value" into "label"` | `type "Q3 Budget" into "Description"` |
| `type "value" into first "label"` | `type "1000" into first "Endorsement Fee"` |
| `clear "label"` | `clear "Search"` |
| `type "value" into "label" and press Enter` | `type "John" into "Search" and press Enter` |

`type "value" into first "label"` targets the first visible instance of a field when the
same label appears multiple times (e.g. repeating rows in a fee configuration form).

### Selection and Checkboxes

| Action | Example |
|--------|---------|
| `select "option" from "label"` | `select "2025/2026" from "Fiscal Cycle"` |
| `select first from "label"` | `select first from "Fiscal Cycle"` |
| `check "label"` | `check "Select all institutions"` |
| `check first in "label"` | `check first in "Programme"` |
| `uncheck "label"` | `uncheck "Notify me"` |

`check first in "label"` is for checkbox lists where any available item is acceptable.
Use it when the test doesn't require a specific value — picks the first visible unchecked item.

### Dialogs and Modals

| Action | Example |
|--------|---------|
| `confirm dialog` | `confirm dialog` |
| `dismiss dialog` | `dismiss dialog` |

Handles any confirmation dialog regardless of button text (Yes / Confirm / OK / etc).
For specific button text, use `click "Confirm Approval"` instead.

### File Upload

| Action | Example |
|--------|---------|
| `upload "filepath" to "label"` | `upload "fixtures/invoice.pdf" to "Supporting Documents"` |
| `upload "filepath" to upload zone` | `upload "fixtures/test.pdf" to upload zone` |

`upload "filepath" to upload zone` is for drag-and-drop areas with no accessible label.
The resolver targets the first visible file input or drop zone in the current context.

### Waiting

| Action | Example |
|--------|---------|
| `wait for "label" to appear` | `wait for "Results" to appear` |
| `wait for "label" to disappear` | `wait for "Loading" to disappear` |
| `wait for page to load` | `wait for page to load` |

### Keyboard, Hover, Scroll

| Action | Example |
|--------|---------|
| `press "key"` | `press "Escape"` |
| `press "modifier+key"` | `press "Ctrl+A"` |
| `hover over "label"` | `hover over "Help icon"` |
| `scroll to "label"` | `scroll to "Footer"` |

---

## 6. Full Assertion Vocabulary

### Visibility

| Assertion | Example |
|-----------|---------|
| `"label" is visible` | `"Submit Button" is visible` |
| `"label" is not visible` | `"Finalize" is not visible` |
| `"label" is visible in action bar` | `"Review" is visible in action bar` |
| `"label" is not visible in action bar` | `"Finalize" is not visible in action bar` |
| `"label" is visible in sidebar` | `"Budgeted Fees" is visible in sidebar` |
| `"label" is visible in breadcrumb` | `"Review Process" is visible in breadcrumb` |
| `"label" tab is visible` | `"Fees" tab is visible` |
| `"label" tab is not visible` | `"Fees" tab is not visible` |
| `modal is open` | `modal is open` |
| `modal is closed` | `modal is closed` |
| `"label" page is visible` | `"Budgeting" page is visible` |
| `"label" view is visible` | `"Board" view is visible` |

### State

| Assertion | Example |
|-----------|---------|
| `"label" is enabled` | `"Save" is enabled` |
| `"label" is disabled` | `"Confirm Approval" is disabled` |
| `"label" tab is active` | `"Pending Discounts" tab is active` |
| `"label" is checked` | `"Select all institutions" is checked` |

### Content

| Assertion | Example |
|-----------|---------|
| `"label" contains "text"` | `"Status" contains "PENDING"` |
| `"label" does not contain "text"` | `"Status" does not contain "FINALIZED"` |
| `"label" equals "text"` | `status badge equals "REVIEWED"` |
| `"label" does not equal "text"` | `status badge does not equal "REVIEWED"` |
| `"label" in "context" equals "text"` | `"Status" in left panel equals "PENDING"` |
| `"label" in "context" shows "text"` | `"Budgeted Fees" in sidebar shows "verified"` |
| `toast shows "text"` | `toast shows "Budget created successfully"` |
| `toast contains "text"` | `toast contains "successfully"` |
| `form error shows "text"` | `form error shows "Financial Period is required"` |
| `error shows "text"` | `error shows "Duplicate Sponsorship Type detected"` |
| `count of "label" is N` | `count of "Budget Row" is 3` |
| `"label" row count decreases by 1` | `"Budgeted Fees" row count decreases by 1` |
| `"context" contains "text"` | `left panel contains "PENDING"` |

### Navigation

| Assertion | Example |
|-----------|---------|
| `url contains "path"` | `url contains "/review"` |
| `url is "path"` | `url is "/budgeting"` |
| `page title is "title"` | `page title is "Budgeting"` |
| `modal stays open` | `modal stays open` |
| `page redirects to "path"` | `page redirects to "/budgeting"` |

---

## 7. Element Resolution Strategy

When axtest encounters `"Save"`, it tries to find the element in this order:

1. Button, link, or interactive element with that **visible text**
2. Element with matching **aria-label**
3. Form input associated with a **label** of that text
4. Element with matching **placeholder** text
5. Element with matching **title** attribute

If no element is found, the test fails with a clear error:

```
ERROR  Could not find element "Save" on page /budgeting/new
       Tried: visible text, aria-label, label, placeholder, title
       Hint:  Ensure the element is visible and its label matches exactly.
              If the app uses icons without text, add an aria-label to the element.
```

### Scoped Resolution

When an action includes context (`in sidebar`, `in action bar`, `in row "X"`, `in modal`),
resolution is scoped to that region first:

```
click "Review" in action bar         # only looks within the action bar
click "Edit" in row "John Smith"     # only looks in the row containing "John Smith"
```

---

## 8. SETUP Block

The `SETUP` block runs before STEPS and is intended for preconditions — selecting an
existing record, navigating to a specific state, etc. It is not reported as test steps;
it is infrastructure for the test.

```
TEST P-12: Add budgeted fees to an existing budget

SETUP
  select budget with status "PENDING" from left panel

STEPS
  click "Add" in "Budgeted Fees" tab
  select first from "Sponsorship Type"
  type "50" into "New Intake"
  click "Save"

ASSERT
  toast shows success
  "Budgeted Fees" tab shows new entry
```

---

## 9. Per-Test AUTH Override

A test can declare its own `AUTH` to override the file-level auth for that test only.
Used for permission-based tests that require a different user role.

```
AUTH standard-login
MODULE budgeting

---

TEST N-11: New button hidden for user without Create permission

AUTH restricted-user
# Overrides standard-login for this test only.
# Requires: auth/restricted-user.axtest

ASSERT
  "New" is not visible

---

TEST P-01: Create a budget (runs with standard-login again)

STEPS
  click "New"
  ...
```

The file-level `AUTH` resumes for all subsequent tests after the override.

---

## 10. DEPENDS ON

Some tests require a previous test to have passed first (e.g. you cannot test the
Approve flow without a REVIEWED budget that was created by the Review flow).

```
TEST P-16: Approve a REVIEWED budget

DEPENDS ON P-14
# If P-14 has not passed in this run, P-16 is skipped with a clear message:
# SKIPPED P-16 — depends on P-14 which has not passed.

SETUP
  select first budget with status "REVIEWED" from left panel

STEPS
  click "Approve" in action bar
  click "Confirm Approval"

ASSERT
  status badge equals "APPROVED"
```

In V1, `DEPENDS ON` causes the dependent test to be **skipped** if the dependency
has not passed. It does not auto-run the dependency — that is a future behaviour.

---

## 11. Multiple STEPS/ASSERT Pairs

Some tests require an intermediate assertion before continuing (observe state, then act).
Repeat STEPS and ASSERT blocks within one TEST as needed:

```
TEST P-16: Approve a REVIEWED budget — verify checklist before confirming

SETUP
  select first budget with status "REVIEWED" from left panel

STEPS
  click "Approve" in action bar

ASSERT
  "Confirm Approval" is enabled
  all requirements show "verified" in checklist

STEPS
  click "Confirm Approval"

ASSERT
  toast contains "successfully"
  status badge equals "APPROVED"
```

Each STEPS block continues from where the previous one left off.
Each ASSERT block is evaluated immediately after its preceding STEPS block.

---

## 13. Variables and Test Data

Use `{{variable}}` syntax for dynamic values:

```
STEPS
  type "{{username}}" into "Email"
  type "{{password}}" into "Password"
  select "{{fiscal_cycle}}" from "Fiscal Cycle"
```

Pass via CLI or `.env` file:

```bash
axtest run --var username=admin@example.com --var fiscal_cycle="2025/2026"
```

`.env` file in project root:

```
USERNAME=admin@example.com
PASSWORD=secret
FISCAL_CYCLE=2025/2026
```

---

## 14. Reusability Rules

- **AUTH** runs once per test suite session. Login is cached and reused across all test files.
- **MODULE** runs once per test file, before the first TEST block.
- Both are optional. A standalone test can navigate independently:

```
TEST Standalone: Check public page

STEPS
  navigate to "/public"

ASSERT
  "Welcome" is visible
```

---

## 15. Result Output

After execution, axtest writes results to a `results/` folder:

```
results/
└── run-2025-01-15-14-32/
    ├── summary.axtest-report          # pass/fail counts, duration, run metadata
    ├── budgeting/
    │   ├── module-05-budget-creation.axtest-report
    │   └── module-06-budget-review.axtest-report
    └── screenshots/
        └── module-05-P-01-step-3-fail.png
```

The summary report is plain text and safe to commit or share:

```
axtest run — 2025-01-15 14:32
────────────────────────────────────────
Module: budgeting/module-05-budget-creation
  ✓ P-01  Create budget with only Fiscal Cycle         (1.2s)
  ✓ P-02  Create budget with all Core fields           (1.8s)
  ✗ P-03  Create budget with permitted institutions    (2.1s)
           FAILED at step 4: Could not find "Permitted Institutions" tab
           Screenshot: screenshots/module-05-P-03-step-4-fail.png

────────────────────────────────────────
Passed:  2   Failed: 1   Skipped: 0
Duration: 5.1s
```

---

## 16. CLI

```bash
# Run all tests
axtest run

# Run a specific module
axtest run tests/budgeting/module-05-budget-creation.axtest

# Run all tests in a folder
axtest run tests/budgeting/

# Run only positive tests (by tag, future)
axtest run --tag positive

# Run with variables
axtest run --var env=staging --var username=tester@example.com

# Validate spec files without running
axtest validate

# Initialize a new project
axtest init
```

---

## 17. Design Principles

1. **Readable by anyone** — a product manager or manual tester should understand a spec file without training.
2. **No selector knowledge required** — elements are identified by what users see, not by CSS or DOM structure.
3. **Fail loudly and helpfully** — error messages tell you exactly what to fix, not just that something broke.
4. **Reuse without repetition** — auth and navigation steps are defined once and referenced by name.
5. **Version-controllable** — spec files live in your repo alongside your code and are diff-able in PRs.
6. **No magic** — the platform does exactly what the spec says, nothing more.
