import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

interface SchemaBaseline {
  sha256: string
  containsProductionRows: boolean
  containsSecrets: boolean
  tables: string[]
  rlsTables: string[]
  functions: string[]
  triggers: string[]
}

const repositoryRoot = process.cwd()
const schemaPath = path.join(repositoryRoot, 'supabase/schema.sql')
const baselinePath = path.join(
  repositoryRoot,
  'supabase/baselines/v1-2026-08-26.schema.json',
)

async function loadBaseline() {
  const [schema, rawBaseline] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(baselinePath, 'utf8'),
  ])

  return {
    schema,
    baseline: JSON.parse(rawBaseline) as SchemaBaseline,
  }
}

describe('V1 sanitized schema baseline', () => {
  it('matches the frozen schema fingerprint', async () => {
    const { schema, baseline } = await loadBaseline()
    const fingerprint = createHash('sha256').update(schema).digest('hex')

    expect(fingerprint).toBe(baseline.sha256)
    expect(baseline.containsProductionRows).toBe(false)
    expect(baseline.containsSecrets).toBe(false)
  })

  it('retains every V1 table and its RLS boundary', async () => {
    const { schema, baseline } = await loadBaseline()

    for (const table of baseline.tables) {
      expect(schema).toMatch(
        new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\s*\\(`, 'i'),
      )
    }

    for (const table of baseline.rlsTables) {
      expect(schema).toMatch(
        new RegExp(`ALTER TABLE\\s+${table}\\s+ENABLE ROW LEVEL SECURITY`, 'i'),
      )
    }
  })

  it('retains the V1 auth function and trigger', async () => {
    const { schema, baseline } = await loadBaseline()

    for (const functionName of baseline.functions) {
      expect(schema).toMatch(
        new RegExp(`CREATE OR REPLACE FUNCTION\\s+${functionName}\\s*\\(`, 'i'),
      )
    }

    for (const triggerName of baseline.triggers) {
      expect(schema).toMatch(
        new RegExp(`CREATE OR REPLACE TRIGGER\\s+${triggerName}\\b`, 'i'),
      )
    }
  })

  it('contains no recognizable credentials or personal email addresses', async () => {
    const { schema } = await loadBaseline()

    const forbiddenPatterns = [
      /postgres(?:ql)?:\/\/[^\s]+/i,
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|DATABASE_URL)\s*=/i,
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
      /\bsk_(?:live|test)_[A-Za-z0-9]+\b/,
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    ]

    for (const pattern of forbiddenPatterns) {
      expect(schema).not.toMatch(pattern)
    }
  })
})
