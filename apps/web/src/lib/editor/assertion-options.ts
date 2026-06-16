import type { AssertionType } from './types'
import type { DropdownOption } from '$lib/components/ui/Dropdown.svelte'

export const ASSERTION_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'is_visible', label: 'Is visible', description: '"Label" is_visible' },
  { value: 'is_not_visible', label: 'Is not visible', description: '"Label" is_not_visible' },
  { value: 'is_enabled', label: 'Is enabled', description: '"Button" is_enabled' },
  { value: 'is_disabled', label: 'Is disabled', description: '"Button" is_disabled' },
  { value: 'contains', label: 'Contains text', description: '"Heading" contains "Welcome"' },
  { value: 'toast_shows', label: 'Toast message', description: 'toast shows "Saved"' },
  { value: 'url_contains', label: 'URL contains', description: 'url contains "/dashboard"' },
  { value: 'modal_open', label: 'Modal is open', description: 'modal is open' },
]

export const ASSERTION_META: Record<AssertionType, { label: string; border: string; dot: string }> = {
  is_visible:     { label: 'Visible',     border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  is_not_visible: { label: 'Hidden',      border: 'border-l-zinc-400',    dot: 'bg-zinc-400' },
  is_enabled:     { label: 'Enabled',     border: 'border-l-sky-500',     dot: 'bg-sky-500' },
  is_disabled:    { label: 'Disabled',    border: 'border-l-orange-500',  dot: 'bg-orange-500' },
  contains:       { label: 'Contains',    border: 'border-l-violet-500',  dot: 'bg-violet-500' },
  toast_shows:    { label: 'Toast',       border: 'border-l-amber-500',   dot: 'bg-amber-500' },
  url_contains:   { label: 'URL',         border: 'border-l-cyan-500',    dot: 'bg-cyan-500' },
  modal_open:     { label: 'Modal',       border: 'border-l-rose-500',    dot: 'bg-rose-500' },
  custom:         { label: 'Custom',      border: 'border-l-red-500',     dot: 'bg-red-500' },
}

/** Autocomplete snippets (body after `assert `). */
export const ASSERTION_SNIPPETS: { label: string; snippet: string }[] = [
  { label: 'is_visible', snippet: '"" is_visible' },
  { label: 'is_not_visible', snippet: '"" is_not_visible' },
  { label: 'is_enabled', snippet: '"" is_enabled' },
  { label: 'is_disabled', snippet: '"" is_disabled' },
  { label: 'contains', snippet: '"" contains ""' },
  { label: 'toast shows', snippet: 'toast shows ""' },
  { label: 'url contains', snippet: 'url contains ""' },
  { label: 'modal is open', snippet: 'modal is open' },
]

export function assertionNeedsTarget(type: AssertionType): boolean {
  return type === 'is_visible' || type === 'is_not_visible' || type === 'is_enabled'
    || type === 'is_disabled' || type === 'contains'
}

export function assertionNeedsValue(type: AssertionType): boolean {
  return type === 'contains' || type === 'toast_shows' || type === 'url_contains'
}
