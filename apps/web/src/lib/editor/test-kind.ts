import type { TestKind } from './types'

export type TestKindFilter = 'all' | 'manual' | Exclude<TestKind, ''>

export const TEST_KIND_FILTER_OPTIONS: { value: TestKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'seed', label: 'Seed' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'edge', label: 'Edge' },
  { value: 'manual', label: 'Manual' },
]

export function matchesKindFilter(kind: TestKind, filter: TestKindFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'manual') return kind === ''
  return kind === filter
}

export function countByKind(tests: { kind: TestKind }[]): Record<TestKindFilter, number> {
  const counts: Record<TestKindFilter, number> = {
    all: tests.length,
    manual: 0,
    seed: 0,
    positive: 0,
    negative: 0,
    edge: 0,
  }
  for (const t of tests) {
    if (t.kind === '') counts.manual++
    else counts[t.kind]++
  }
  return counts
}

export const TEST_KIND_LABELS: Record<Exclude<TestKind, ''>, string> = {
  seed: 'Seed',
  positive: 'Positive',
  negative: 'Negative',
  edge: 'Edge',
}

export const TEST_KIND_STYLES: Record<Exclude<TestKind, ''>, string> = {
  seed: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  positive: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  negative: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  edge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
}

export const TEST_KIND_OPTIONS = (
  ['', 'seed', 'positive', 'negative', 'edge'] as TestKind[]
).map(k => ({
  value: k,
  label: k ? TEST_KIND_LABELS[k] : 'Manual',
  description: k === 'seed'
    ? 'Golden path — generate variants from this test'
    : k === 'positive'
      ? 'Valid / expected scenario'
      : k === 'negative'
        ? 'Invalid input or wrong flow'
        : k === 'edge'
          ? 'Boundary or accidental input'
          : 'Written manually',
}))
