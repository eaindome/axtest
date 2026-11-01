// Tab memory only. Never serialize target credentials into browser storage.
const inputs = new Map<string, Record<string, string>>()
export function rememberedRunInputs(scope: string): Record<string, string> { return { ...inputs.get(scope) } }
export function rememberRunInputs(scope: string, values: Record<string, string>) {
  const reusable = Object.fromEntries(Object.entries(values).filter(([name]) => name !== 'AXTEST_CASE'))
  if (Object.keys(reusable).length) inputs.set(scope, { ...inputs.get(scope), ...reusable })
}
export function clearRunInputs(scope?: string) { if (scope) inputs.delete(scope); else inputs.clear() }
