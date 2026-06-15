import type { StepType } from './types'
import { STEP_META } from './types'
import type { DropdownOption } from '$lib/components/ui/Dropdown.svelte'

export const STEP_TYPE_OPTIONS: DropdownOption[] = (
  ['navigate', 'click', 'type', 'select', 'clear'] as StepType[]
).map(t => ({
  value: t,
  label: STEP_META[t].label,
  dot: STEP_META[t].dot,
}))

export const AUTH_OPTIONS: DropdownOption[] = [
  { value: '', label: 'None', description: 'No auth flow' },
  { value: 'standard-login', label: 'standard-login', description: 'Default user login' },
  { value: 'admin-login', label: 'admin-login', description: 'Admin credentials' },
]

export const ENV_OPTIONS: DropdownOption[] = [
  { value: 'staging', label: 'Staging', dot: 'bg-sky-500' },
  { value: 'production', label: 'Production', dot: 'bg-emerald-500' },
  { value: 'local', label: 'Local', dot: 'bg-violet-500' },
]

export function dependsOnOptions(tests: { id: string; name: string }[], currentId: string): DropdownOption[] {
  const opts: DropdownOption[] = [
    { value: '', label: 'None', description: 'No dependency' },
  ]
  for (const t of tests) {
    if (t.id === currentId) continue
    opts.push({ value: t.name, label: t.name })
  }
  return opts
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
