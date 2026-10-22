import { describe, expect, it } from 'vitest'
import { importUserV1State, inspectV1UpgradeStatus } from './import-v1-learning-state.js'

describe('V1 database import runner', () => {
  it('returns no_v1_state without writing when a user has no legacy blob', async () => {
    const calls = []
    const client = {
      async query(sql) {
        calls.push(String(sql))
        if (String(sql).startsWith('SELECT state')) return { rowCount: 0, rows: [] }
        return { rowCount: 0, rows: [] }
      },
    }
    await expect(importUserV1State(client, 12)).resolves.toEqual({ status: 'no_v1_state' })
    expect(calls).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']))
    expect(calls.some((sql) => sql.startsWith('INSERT'))).toBe(false)
  })

  it('reports a stale import without writing V2 records', async () => {
    const state = { goal: 15, reviews: {}, favorites: [], difficult: [], mistakes: {}, activity: {}, completedGrammar: [], completedExercises: [] }
    const calls = []
    const client = {
      async query(sql) {
        const statement = String(sql)
        calls.push(statement)
        if (statement === 'SELECT state FROM learning_states WHERE user_id = $1 FOR UPDATE') return { rowCount: 1, rows: [{ state }] }
        if (statement.includes('FROM vocabulary_entries')) return { rowCount: 0, rows: [] }
        if (statement.includes('FROM v1_import_runs')) return { rowCount: 1, rows: [{ id: 'prior-run', source_checksum: 'a'.repeat(64) }] }
        return { rowCount: 0, rows: [] }
      },
    }
    await expect(importUserV1State(client, 12)).resolves.toMatchObject({
      status: 'v1_state_changed_after_import', runId: 'prior-run',
    })
    expect(calls.some((sql) => sql.startsWith('INSERT INTO review_cards'))).toBe(false)
  })

  it('reports that V1 data is retained when the V2 event schema is unavailable', async () => {
    const client = {
      async query(sql) {
        if (String(sql).startsWith('SELECT state, updated_at')) {
          return { rowCount: 1, rows: [{ state: { goal: 15 }, updated_at: new Date('2026-10-22T00:00:00.000Z') }] }
        }
        throw new Error('V2 import table must not be queried before its schema exists')
      },
    }
    await expect(inspectV1UpgradeStatus(client, 12, { v2SchemaReady: false })).resolves.toMatchObject({
      v2SchemaReady: false,
      migration: 'schema_not_ready',
      v1: { exists: true, updatedAt: '2026-10-22T00:00:00.000Z' },
    })
  })
})
