import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

interface OpenApiOperation {
  operationId?: string
  parameters?: Array<{ $ref?: string; name?: string }>
}

interface OpenApiContract {
  openapi: string
  security: Array<Record<string, unknown>>
  paths: Record<string, Record<string, OpenApiOperation>>
  components: {
    parameters: Record<string, unknown>
    schemas: Record<string, { properties?: Record<string, unknown> }>
  }
}

function collectLocalReferences(value: unknown, references: string[] = []) {
  if (!value || typeof value !== 'object') return references

  if ('$ref' in value && typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
    references.push(value.$ref)
  }

  for (const nested of Object.values(value)) collectLocalReferences(nested, references)
  return references
}

function resolveLocalReference(contract: OpenApiContract, reference: string) {
  return reference
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[segment]
    }, contract)
}

const repositoryRoot = process.cwd()
const migrationDirectory = path.join(repositoryRoot, 'supabase/migrations')
const migrationFiles = [
  '20260826173000_v2_question_bank.sql',
  '20260826174000_v2_practice_state.sql',
  '20260826175000_v2_rls_and_grants.sql',
  '20260826180000_v2_profiles.sql',
]

const expectedTables = [
  'v2_questions',
  'v2_question_versions',
  'v2_question_keys',
  'v2_question_reviews',
  'v2_question_metrics',
  'v2_daily_recommendations',
  'v2_practice_sessions',
  'v2_attempts',
  'v2_attempt_events',
  'v2_user_skill_state',
  'v2_review_items',
  'v2_adaptation_events',
  'v2_scratch_insights',
  'v2_profiles',
]

async function loadMigrations() {
  const contents = await Promise.all(
    migrationFiles.map((file) => readFile(path.join(migrationDirectory, file), 'utf8')),
  )
  return contents.join('\n')
}

async function loadContract() {
  const raw = await readFile(
    path.join(repositoryRoot, 'contracts/v2/openapi.json'),
    'utf8',
  )
  return JSON.parse(raw) as OpenApiContract
}

describe('V2 additive database contract', () => {
  it('creates every planned V2 table and enables RLS on each one', async () => {
    const sql = await loadMigrations()

    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`create table public\\.${table}\\s*\\(`, 'i'))
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, 'i'),
      )
    }
  })

  it('does not destructively change or rename a V1 table', async () => {
    const sql = await loadMigrations()

    expect(sql).not.toMatch(/\bdrop\s+(?:table|column|schema)\b/i)
    expect(sql).not.toMatch(/\btruncate\b/i)
    expect(sql).not.toMatch(/\balter\s+table\s+public\.(?!v2_)/i)
    expect(sql).not.toMatch(/\bdelete\s+from\s+public\.(?!v2_)/i)
  })

  it('keeps answer keys server-only and denies all authenticated writes', async () => {
    const sql = await loadMigrations()

    expect(sql).toMatch(/revoke all on table public\.v2_question_keys from anon, authenticated/i)
    expect(sql).not.toMatch(/grant select on table public\.v2_question_keys to authenticated/i)
    expect(sql).not.toMatch(
      /grant\s+(?:[^;]*\b(?:insert|update|delete)\b[^;]*)\s+on\s+table\s+public\.v2_[^;]+\s+to\s+authenticated/i,
    )
    expect(sql).toMatch(/grant select, insert, update, delete on table public\.v2_question_keys to service_role/i)
  })

  it('stores structured scratch signals without a raw drawing or image column', async () => {
    const sql = await loadMigrations()
    const scratchTable = sql.match(
      /create table public\.v2_scratch_insights\s*\(([\s\S]*?)\n\);/i,
    )?.[1]

    expect(scratchTable).toBeDefined()
    expect(scratchTable).not.toMatch(/raw[_ ]?(?:image|drawing)|image_path|pencilkit|drawing_data/i)
    expect(scratchTable).toMatch(/stroke_count/i)
    expect(scratchTable).toMatch(/diagnostic_confidence/i)
  })
})

describe('V2 OpenAPI contract', () => {
  it('is OpenAPI 3.1 and includes the complete student route set', async () => {
    const contract = await loadContract()
    const expectedStudentPaths = [
      '/bootstrap',
      '/home',
      '/sessions',
      '/sessions/{sessionId}/next',
      '/sessions/{sessionId}/attempts',
      '/attempts/{attemptId}/classification',
      '/sessions/{sessionId}/end',
      '/progress',
      '/review',
      '/review/{reviewItemId}/action',
      '/profile',
      '/account',
    ]

    expect(contract.openapi).toBe('3.1.0')
    expect(contract.security).toEqual([{ bearerAuth: [] }])
    for (const route of expectedStudentPaths) expect(contract.paths).toHaveProperty(route)
  })

  it('requires an idempotency key on every mutation', async () => {
    const contract = await loadContract()
    const mutationMethods = new Set(['post', 'patch', 'delete'])

    for (const [route, pathItem] of Object.entries(contract.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!mutationMethods.has(method)) continue

        const references = operation.parameters?.map((parameter) => parameter.$ref) ?? []
        expect(references, `${method.toUpperCase()} ${route}`).toContain(
          '#/components/parameters/IdempotencyKey',
        )
      }
    }
  })

  it('resolves every local reference and keeps operation IDs unique', async () => {
    const contract = await loadContract()
    const references = collectLocalReferences(contract)
    const operationIds = Object.values(contract.paths)
      .flatMap((pathItem) => Object.values(pathItem))
      .map((operation) => operation.operationId)
      .filter((operationId): operationId is string => Boolean(operationId))

    expect(references.length).toBeGreaterThan(0)
    for (const reference of references) {
      expect(resolveLocalReference(contract, reference), reference).toBeDefined()
    }
    expect(new Set(operationIds).size).toBe(operationIds.length)
  })

  it('never exposes an answer key in the pre-submission question payload', async () => {
    const contract = await loadContract()
    const questionProperties = contract.components.schemas.QuestionPayload.properties ?? {}
    const feedbackProperties = contract.components.schemas.AttemptFeedback.properties ?? {}

    for (const forbidden of [
      'correctAnswer',
      'correctChoiceId',
      'explanation',
      'distractorRationales',
      'validationEvidence',
    ]) {
      expect(questionProperties).not.toHaveProperty(forbidden)
    }

    expect(feedbackProperties).toHaveProperty('correctAnswer')
    expect(feedbackProperties).toHaveProperty('explanation')
  })

  it('keeps admin drafting and two-pass review actions in the contract', async () => {
    const contract = await loadContract()

    expect(contract.paths['/admin/questions']).toHaveProperty('post')
    expect(contract.paths['/admin/questions/{questionId}/reviews']).toHaveProperty('post')
    expect(contract.paths['/admin/questions/{questionId}/publish']).toHaveProperty('post')
    expect(contract.paths['/admin/questions/{questionId}/quarantine']).toHaveProperty('post')
  })
})
