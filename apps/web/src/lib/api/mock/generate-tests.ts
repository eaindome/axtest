import { parseAxtest, serializeAxtest } from '$lib/editor/parse-axtest'
import { appendGeneratedTests } from '$lib/editor/generate-tests'
import type { GenerateTestsRequest, GenerateTestsResponse } from '../types'

export function mockGenerateTests(req: GenerateTestsRequest): GenerateTestsResponse {
  const parsed = parseAxtest(req.content)
  const { parsed: next, count } = appendGeneratedTests(parsed, req.seedTestId)
  return {
    content: serializeAxtest(next),
    generatedCount: count,
  }
}
