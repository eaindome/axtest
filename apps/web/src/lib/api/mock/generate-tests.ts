import { parseAxtest, serializeAxtest } from '$lib/editor/parse-axtest'
import { appendGeneratedTests } from '$lib/editor/generate-tests'
import type { GenerateTestsRequest, GenerateTestsResponse } from '../types'

export function mockGenerateTests(req: GenerateTestsRequest): GenerateTestsResponse {
  const parsed = parseAxtest(req.content)
  if (!parsed.tests.some(t => t.id === req.seedTestId)) {
    const seeds = parsed.tests.filter(t => t.kind === 'seed')
    const seed = seeds.length === 1 ? seeds[0] : parsed.tests.length === 1 ? parsed.tests[0] : null
    if (seed && !/^\s*ID\s+/m.test(req.content)) seed.id = req.seedTestId
  }
  const { parsed: next, count } = appendGeneratedTests(parsed, req.seedTestId)
  return {
    content: serializeAxtest(next),
    generatedCount: count,
  }
}
