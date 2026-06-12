// ─── AST ─────────────────────────────────────────────────────────────────────

export type FileContext = {
  filePath: string
  auth?: string
  module?: string
  tests: TestSpec[]
}

export type TestSpec = {
  id: string
  description: string
  auth?: string
  dependsOn?: string[]
  setup: Action[]
  stepGroups: StepGroup[]
}

export type StepGroup = {
  steps: Action[]
  assertions: Assertion[]
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ScopeType = 'sidebar' | 'actionBar' | 'modal' | 'row' | 'breadcrumb'

export type Action =
  | ClickAction
  | ClickTabAction
  | DoubleClickAction
  | TypeAction
  | ClearAction
  | SelectAction
  | CheckAction
  | UncheckAction
  | NavigateAction
  | GoBackAction
  | RefreshAction
  | WaitAction
  | UploadAction
  | PressAction
  | ConfirmDialogAction
  | DismissDialogAction
  | OpenActionMenuAction
  | ScrollAction
  | HoverAction
  | SetupSelectAction

export type ClickAction = { type: 'click'; target: string; scope?: ScopeType; context?: string; raw: string }
export type ClickTabAction = { type: 'click_tab'; target: string; raw: string }
export type DoubleClickAction = { type: 'double_click'; target: string; raw: string }
export type TypeAction = { type: 'type'; value: string; target: string; position?: 'first'; pressAfter?: string; raw: string }
export type ClearAction = { type: 'clear'; target: string; raw: string }
export type SelectAction = { type: 'select'; option: string; target: string; raw: string }
export type CheckAction = { type: 'check'; target: string; position?: 'first'; raw: string }
export type UncheckAction = { type: 'uncheck'; target: string; raw: string }
export type NavigateAction = { type: 'navigate'; path: string; raw: string }
export type GoBackAction = { type: 'go_back'; raw: string }
export type RefreshAction = { type: 'refresh'; raw: string }
export type WaitAction = { type: 'wait'; target?: string; condition: 'appear' | 'disappear' | 'page_load'; raw: string }
export type UploadAction = { type: 'upload'; file: string; target: string | null; raw: string }
export type PressAction = { type: 'press'; key: string; raw: string }
export type ConfirmDialogAction = { type: 'confirm_dialog'; raw: string }
export type DismissDialogAction = { type: 'dismiss_dialog'; raw: string }
export type OpenActionMenuAction = { type: 'open_action_menu'; context?: string; scope?: 'first_row'; table?: string; raw: string }
export type ScrollAction = { type: 'scroll'; target: string; raw: string }
export type HoverAction = { type: 'hover'; target: string; raw: string }
export type SetupSelectAction = { type: 'setup_select'; entityType: string; status?: string; from: string; raw: string }

// ─── Assertions ──────────────────────────────────────────────────────────────

export type Assertion =
  | VisibilityAssertion
  | StateAssertion
  | ContentAssertion
  | ToastAssertion
  | ErrorAssertion
  | CountAssertion
  | UrlAssertion
  | ModalAssertion
  | HasEntryAssertion
  | ShowsIndicatorAssertion

export type VisibilityAssertion = {
  type: 'is_visible' | 'is_not_visible'
  target: string
  scope?: ScopeType | string
  kind?: 'tab'
  raw: string
}

export type StateAssertion = {
  type: 'is_enabled' | 'is_disabled' | 'is_checked' | 'is_active'
  target: string
  scope?: string
  kind?: 'tab'
  raw: string
}

export type ContentAssertion = {
  type: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'shows'
  target: string
  expected: string
  scope?: string
  raw: string
}

export type ToastAssertion = {
  type: 'toast_shows' | 'toast_contains'
  expected: string
  raw: string
}

export type ErrorAssertion = {
  type: 'form_error' | 'error_shows'
  expected: string
  raw: string
}

export type CountAssertion = {
  type: 'count_is' | 'count_decreases'
  target: string
  count?: number
  by?: number
  raw: string
}

export type UrlAssertion = {
  type: 'url_is' | 'url_contains' | 'redirects_to'
  expected: string
  raw: string
}

export type ModalAssertion = {
  type: 'modal_is_open' | 'modal_is_closed' | 'modal_stays_open'
  raw: string
}

export type HasEntryAssertion = {
  type: 'has_entry'
  target: string
  kind?: 'tab'
  raw: string
}

export type ShowsIndicatorAssertion = {
  type: 'shows_indicator'
  target: string
  indicator: string
  raw: string
}

// ─── Run types ───────────────────────────────────────────────────────────────

export type RunOptions = {
  file?: string
  testId?: string
  env?: string
  vars?: Record<string, string>
  reporter?: 'text' | 'json' | 'junit'
  bail?: boolean
  headed?: boolean
  baseUrl?: string
}

export type StepResult = {
  raw: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  screenshot?: string
}

export type TestResult = {
  id: string
  description: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  steps: StepResult[]
  skipReason?: string
}

export type RunResult = {
  file: string
  status: 'passed' | 'failed' | 'errored'
  duration: number
  passed: number
  failed: number
  skipped: number
  tests: TestResult[]
  error?: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

export type AxtestConfig = {
  baseUrl: string
  browser: 'chromium' | 'firefox' | 'webkit'
  timeout: number
  screenshots: 'always' | 'on-failure' | 'never'
}
