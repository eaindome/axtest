export type StepType = 'navigate' | 'click' | 'type' | 'select' | 'clear' | 'assert'

export type TestKind = '' | 'seed' | 'positive' | 'negative' | 'edge'

/** Structured validation / behaviour rules — parallel to step verbs. */
export type RuleType =
  | 'field_required'
  | 'field_format'
  | 'field_length'
  | 'field_range'
  | 'show_error'
  | 'url_contains'
  | 'element_visible'
  | 'element_state'
  | 'note'

export interface Rule {
  id: string
  type: RuleType
  /** Field name, element label, or trigger (e.g. invalid_login). */
  target: string
  /** Format, error message, path, min value, or state verb. */
  value: string
  /** Max value for length/range rules. */
  value2: string
}

export interface Step {
  id: string
  type: StepType
  target: string
  value: string
  context: string
  assertion: string
}

export interface TestBlock {
  id: string
  name: string
  kind: TestKind
  generatedFrom: string
  dependsOn: string
  steps: Step[]
  asserts: Step[]
}

export interface ParsedFile {
  title: string
  baseUrl: string
  auth: string
  rules: Rule[]
  tests: TestBlock[]
}

export interface TreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  children?: TreeNode[]
  file?: { id: string; name: string; path: string; updatedAt: string }
}

export const STEP_META: Record<StepType, { label: string; border: string; dot: string }> = {
  navigate: { label: 'Navigate', border: 'border-l-sky-500',    dot: 'bg-sky-500' },
  click:    { label: 'Click',    border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  type:     { label: 'Type',     border: 'border-l-violet-500',  dot: 'bg-violet-500' },
  select:   { label: 'Select',   border: 'border-l-orange-500',  dot: 'bg-orange-500' },
  clear:    { label: 'Clear',    border: 'border-l-zinc-400',    dot: 'bg-zinc-400' },
  assert:   { label: 'Assert',   border: 'border-l-amber-500',   dot: 'bg-amber-500' },
}
