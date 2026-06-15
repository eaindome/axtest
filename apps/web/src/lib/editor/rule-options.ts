import type { RuleType } from './types'
import type { DropdownOption } from '$lib/components/ui/Dropdown.svelte'

export const RULE_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'field_required', label: 'Required field', description: 'field "Name" is required' },
  { value: 'field_format', label: 'Field format', description: 'field "Email" must_be email' },
  { value: 'field_length', label: 'Field length', description: 'length between min and max' },
  { value: 'field_range', label: 'Numeric range', description: 'value between min and max' },
  { value: 'show_error', label: 'Error message', description: 'on trigger show error "…"' },
  { value: 'url_contains', label: 'URL contains', description: 'url contains "/path"' },
  { value: 'element_visible', label: 'Visibility', description: 'element is visible or hidden' },
  { value: 'element_state', label: 'Element state', description: 'element is enabled or disabled' },
]

export const FIELD_FORMAT_OPTIONS: DropdownOption[] = [
  { value: 'email', label: 'email' },
  { value: 'phone', label: 'phone' },
  { value: 'number', label: 'number' },
  { value: 'date', label: 'date' },
  { value: 'url', label: 'url' },
  { value: 'alphanumeric', label: 'alphanumeric' },
]

export const VISIBILITY_OPTIONS: DropdownOption[] = [
  { value: 'is_visible', label: 'is visible' },
  { value: 'is_hidden', label: 'is hidden' },
]

export const STATE_OPTIONS: DropdownOption[] = [
  { value: 'is_enabled', label: 'is enabled' },
  { value: 'is_disabled', label: 'is disabled' },
]

export const RULE_META: Record<RuleType, { label: string; border: string; dot: string }> = {
  field_required:  { label: 'Required',  border: 'border-l-rose-500',   dot: 'bg-rose-500' },
  field_format:    { label: 'Format',    border: 'border-l-sky-500',    dot: 'bg-sky-500' },
  field_length:    { label: 'Length',    border: 'border-l-violet-500', dot: 'bg-violet-500' },
  field_range:     { label: 'Range',     border: 'border-l-orange-500', dot: 'bg-orange-500' },
  show_error:      { label: 'Error',     border: 'border-l-red-500',    dot: 'bg-red-500' },
  url_contains:    { label: 'URL',       border: 'border-l-cyan-500',   dot: 'bg-cyan-500' },
  element_visible: { label: 'Visible',   border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  element_state:   { label: 'State',     border: 'border-l-amber-500',  dot: 'bg-amber-500' },
  note:            { label: 'Note',      border: 'border-l-zinc-400',   dot: 'bg-zinc-400' },
}
