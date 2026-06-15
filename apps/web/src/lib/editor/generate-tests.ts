import type { ParsedFile, Rule, Step, TestBlock, TestKind } from './types'
import { makeStep } from './parse-axtest'

function errorAssertion(rules: Rule[]): string {
  const err = rules.find(r => r.type === 'show_error')
  if (err?.value) return `"${err.value}" is_visible`
  return '"error" is_visible'
}

function cloneSteps(steps: Step[]): Step[] {
  return steps.map(s => ({ ...s, id: crypto.randomUUID() }))
}

function cloneAsserts(asserts: Step[]): Step[] {
  return asserts.map(s => ({ ...s, id: crypto.randomUUID() }))
}

function variantBaseName(seedName: string, suffix: string): string {
  return `${seedName} — ${suffix}`
}

/** True if a generated test for this seed + variant suffix already exists (including numbered duplicates). */
function hasVariantForSuffix(names: Iterable<string>, seedName: string, suffix: string): boolean {
  const base = variantBaseName(seedName, suffix)
  for (const name of names) {
    if (name === base || name.startsWith(`${base} (`)) return true
  }
  return false
}

export function countPendingVariants(seed: TestBlock, rules: Rule[], allTests: TestBlock[]): number {
  const names = new Set(allTests.map(t => t.name))
  return buildVariants(seed, rules).filter(spec => !hasVariantForSuffix(names, seed.name, spec.suffix)).length
}

export function canGenerateFromSeed(seed: TestBlock, rules: Rule[], allTests: TestBlock[]): boolean {
  return countPendingVariants(seed, rules, allTests) > 0
}

function uniqueName(base: string, suffix: string, taken: Set<string>): string {
  let name = `${base} — ${suffix}`
  let n = 2
  while (taken.has(name)) {
    name = `${base} — ${suffix} (${n})`
    n++
  }
  taken.add(name)
  return name
}

function findTypeSteps(steps: Step[]): Step[] {
  return steps.filter(s => s.type === 'type' || s.type === 'select')
}

interface VariantSpec {
  kind: Exclude<TestKind, '' | 'seed'>
  suffix: string
  mutateSteps: (steps: Step[]) => Step[]
  mutateAsserts: (asserts: Step[], seed: TestBlock) => Step[]
}

function buildVariants(seed: TestBlock, rules: Rule[]): VariantSpec[] {
  const typeSteps = findTypeSteps(seed.steps)
  const firstField = typeSteps[0]
  const errAssert = errorAssertion(rules)
  const requiredMsg = rules.find(r => r.type === 'field_required')?.target
    ? `"required" is_visible`
    : errAssert

  const variants: VariantSpec[] = []

  if (firstField) {
    const fieldLabel = firstField.target || 'field'
    variants.push({
      kind: 'positive',
      suffix: `alternate valid ${fieldLabel}`,
      mutateSteps: steps => steps.map(s => {
        if (s.id !== firstField.id) return { ...s }
        if (s.type === 'type') return { ...s, value: s.value ? `${s.value}.alt` : 'valid@example.com' }
        if (s.type === 'select') return { ...s, value: s.value || 'Option B' }
        return { ...s }
      }),
      mutateAsserts: asserts => cloneAsserts(asserts),
    })
    variants.push({
      kind: 'negative',
      suffix: `empty ${fieldLabel}`,
      mutateSteps: steps => steps.map(s => {
        if (s.id !== firstField.id) return { ...s }
        if (s.type === 'type' || s.type === 'select') return { ...s, value: '' }
        return { ...s }
      }),
      mutateAsserts: () => [makeStep('assert'), { ...makeStep('assert'), assertion: errAssert }],
    })
    variants.push({
      kind: 'negative',
      suffix: `invalid ${fieldLabel}`,
      mutateSteps: steps => steps.map(s => {
        if (s.id !== firstField.id) return { ...s }
        if (s.type === 'type') return { ...s, value: 'not-valid@@@' }
        return { ...s }
      }),
      mutateAsserts: () => [makeStep('assert'), { ...makeStep('assert'), assertion: errAssert }],
    })
    variants.push({
      kind: 'edge',
      suffix: `very long ${fieldLabel}`,
      mutateSteps: steps => steps.map(s => {
        if (s.id !== firstField.id) return { ...s }
        if (s.type === 'type') return { ...s, value: 'x'.repeat(256) }
        return { ...s }
      }),
      mutateAsserts: asserts => cloneAsserts(asserts),
    })
    variants.push({
      kind: 'edge',
      suffix: `whitespace only ${fieldLabel}`,
      mutateSteps: steps => steps.map(s => {
        if (s.id !== firstField.id) return { ...s }
        if (s.type === 'type') return { ...s, value: '   ' }
        return { ...s }
      }),
      mutateAsserts: () => [makeStep('assert'), { ...makeStep('assert'), assertion: requiredMsg }],
    })
  }

  if (variants.length === 0) {
    variants.push(
      {
        kind: 'positive',
        suffix: 'repeat happy path',
        mutateSteps: steps => cloneSteps(steps),
        mutateAsserts: asserts => cloneAsserts(asserts),
      },
      {
        kind: 'negative',
        suffix: 'skip final step',
        mutateSteps: steps => cloneSteps(steps).slice(0, Math.max(1, steps.length - 1)),
        mutateAsserts: () => [makeStep('assert'), { ...makeStep('assert'), assertion: errAssert }],
      },
      {
        kind: 'edge',
        suffix: 'double submit',
        mutateSteps: steps => {
          const cloned = cloneSteps(steps)
          const last = cloned[cloned.length - 1]
          if (last) cloned.push({ ...last, id: crypto.randomUUID() })
          return cloned
        },
        mutateAsserts: asserts => cloneAsserts(asserts),
      },
    )
  }

  return variants
}

export function generateTestsFromSeed(
  seed: TestBlock,
  rules: Rule[],
  existingNames: Set<string>,
): TestBlock[] {
  const taken = new Set(existingNames)
  const variants = buildVariants(seed, rules).filter(
    spec => !hasVariantForSuffix(taken, seed.name, spec.suffix),
  )

  return variants.map(spec => {
    const steps = spec.mutateSteps(cloneSteps(seed.steps))
    const asserts = spec.mutateAsserts(cloneAsserts(seed.asserts), seed)
    const name = uniqueName(seed.name, spec.suffix, taken)
    return {
      id: crypto.randomUUID(),
      name,
      kind: spec.kind,
      generatedFrom: seed.name,
      dependsOn: seed.name,
      steps,
      asserts,
    }
  })
}

export function appendGeneratedTests(parsed: ParsedFile, seedTestId: string): { parsed: ParsedFile; count: number } {
  const seedIdx = parsed.tests.findIndex(t => t.id === seedTestId)
  if (seedIdx < 0) return { parsed, count: 0 }

  let tests = [...parsed.tests]
  let seed = { ...tests[seedIdx] }

  if (seed.kind !== 'seed') {
    tests = tests.map(t => ({ ...t, kind: t.id === seedTestId ? 'seed' as const : (t.kind === 'seed' ? '' as const : t.kind) }))
    seed = { ...seed, kind: 'seed' }
    tests[seedIdx] = seed
  } else {
    tests = tests.map(t => t.kind === 'seed' && t.id !== seedTestId ? { ...t, kind: '' as const } : t)
  }

  const existing = new Set(tests.map(t => t.name))
  const generated = generateTestsFromSeed(seed, parsed.rules, existing)
  if (generated.length === 0) return { parsed: { ...parsed, tests }, count: 0 }

  return {
    parsed: {
      ...parsed,
      tests: [
        ...tests.slice(0, seedIdx + 1),
        ...generated,
        ...tests.slice(seedIdx + 1),
      ],
    },
    count: generated.length,
  }
}
