export interface DocSection {
  id: string
  title: string
  summary: string
  content: string
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'What axtest is and how modules fit together.',
    content: `axtest lets QA teams write browser tests in plain **.axtest** files — one file per module, with a seed happy-path test and generated variants.

**Typical workflow**
1. Open the **Test Editor** and pick a project
2. Create or open a file under \`modules/\` or \`scenarios/\`
3. Configure **File setup** (title, URL, auth, rules)
4. Write one **seed** test and run it
5. **Generate** positive, negative, and edge cases
6. Run the suite and review failures`,
  },
  {
    id: 'file-format',
    title: 'File format',
    summary: 'Frontmatter, AUTH, RULES, and TEST blocks.',
    content: `Every spec file has three layers:

\`\`\`text
---
title: Module name
base_url: https://app.example.com
---

AUTH standard-login

RULES
  field "Email" must_be email
  on invalid_login show error "Invalid credentials"

TEST "Happy path login"
  TAG seed
  STEPS
    navigate to /login
    type "user@example.com" in "Email"
  ASSERT
    assert "Dashboard" is_visible
\`\`\`

- **Frontmatter** — module title and base URL
- **AUTH** — reusable login flow from \`auth/\`
- **RULES** — validation constraints (see Rules)
- **TEST** — named scenario with STEPS and ASSERT`,
  },
  {
    id: 'writing-steps',
    title: 'Writing steps',
    summary: 'Verbs: navigate, click, type, select, clear, assert.',
    content: `Steps use a small verb vocabulary — similar to Gherkin but executable:

| Verb | Example |
|------|---------|
| navigate | \`navigate to /dashboard\` |
| click | \`click "Save"\` |
| type | \`type "hello" in "Name"\` |
| select | \`select "Option A" in "Country"\` |
| clear | \`clear "Search"\` |
| assert | \`assert "Success" is_visible\` |

Use **Code** view for speed; **Visual** view for guided editing with dropdowns.`,
  },
  {
    id: 'rules',
    title: 'Validation rules',
    summary: 'Structured RULES block — not free-form notes.',
    content: `Rules describe what the application must enforce. They guide **Generate** when building negative and edge cases.

| Rule type | Syntax |
|-----------|--------|
| Required | \`field "Email" is required\` |
| Format | \`field "Email" must_be email\` |
| Length | \`field "Password" length between 8 and 64\` |
| Range | \`field "Amount" between 1 and 10000\` |
| Error | \`on invalid_login show error "Invalid credentials"\` |
| URL | \`url contains "/dashboard"\` |
| Visibility | \`element "Modal" is_visible\` |
| State | \`element "Submit" is_disabled\` |

Add rules in **File setup → Rules** or directly under a \`RULES\` block in code.`,
  },
  {
    id: 'visual-editor',
    title: 'Visual editor',
    summary: 'File setup vs Test cases, filters, and badges.',
    content: `The visual editor splits work into two tabs:

- **File setup** — module metadata and rules
- **Test cases** — test cards with steps and assertions

**Test kinds** (set per test):
- **Seed** — golden path; run it, then Generate variants
- **Positive** — valid alternate scenarios
- **Negative** — wrong inputs; should show errors
- **Edge** — boundaries, empty fields, double-submit

Use **Filter** chips in the outline or test view to focus on one kind.`,
  },
  {
    id: 'generation',
    title: 'Generating tests',
    summary: 'From one seed to a full scenario matrix.',
    content: `1. Mark a passing test as **Seed** (Kind dropdown)
2. **Run** the seed — it must pass
3. Click **Generate** on the seed card

Generated tests are inserted after the seed, tagged by kind, and set to **Depends on** the seed.

The generator reads your **RULES** (e.g. error messages for negative asserts). Review and edit generated steps before saving.`,
  },
  {
    id: 'running',
    title: 'Running tests',
    summary: 'Environments, single test vs full file.',
    content: `Use the toolbar **Run** button for the whole file, or **Run** on a single test card.

- Pick **Staging**, **Production**, or **Local** environment
- Results appear in the bottom panel — click failed rows to inspect
- Validation errors in code view are clickable (\`N err\` / \`N warn\`)

Save before run if you see the unsaved dot on the filename.`,
  },
  {
    id: 'explorer',
    title: 'File explorer',
    summary: 'Folders, create, move, and organize specs.',
    content: `Every project includes \`auth/\` and \`modules/\` by default.

- **Right-click** or **+** menu — new file / folder
- **Drag and drop** to move files and folders
- **Rename** and **Delete** from the context menu

Keep shared login flows in \`auth/\`. Module specs live in \`modules/\` or custom folders like \`scenarios/\`.`,
  },
]

export function getDocSection(id: string): DocSection | undefined {
  return DOC_SECTIONS.find(s => s.id === id)
}
