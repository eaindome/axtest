export interface RunPreferences { headed: boolean; slowMoMs: number }
export const speedOptions = [
  { value: '0', label: 'Fast · no added delay' },
  { value: '400', label: 'Standard · 400 ms' },
  { value: '1000', label: 'Slow · 1 second' },
]
export function runPreferences(value: unknown): RunPreferences {
  const saved = value && typeof value === 'object' ? value as Partial<RunPreferences> : {}
  return { headed: saved.headed === true, slowMoMs: [0, 400, 1000].includes(saved.slowMoMs ?? -1) ? saved.slowMoMs! : 400 }
}
export interface ResultsView { query: string; status: string; page: number }
export function resultsView(value?: unknown): ResultsView {
  const saved = value && typeof value === 'object' ? value as Partial<ResultsView> : {}
  return { query: typeof saved.query === 'string' ? saved.query : '', status: ['all', 'passed', 'failed', 'skipped'].includes(saved.status ?? '') ? saved.status! : 'all', page: Number.isSafeInteger(saved.page) && saved.page! > 0 ? saved.page! : 1 }
}
