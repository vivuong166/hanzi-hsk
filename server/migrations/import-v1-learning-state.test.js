import { describe, expect, it } from 'vitest'
import { importUserV1State } from './import-v1-learning-state.js'

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
})
