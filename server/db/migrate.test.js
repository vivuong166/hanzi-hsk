import { describe, expect, it } from 'vitest'
import { applyMigrations } from './migrate.js'

function fakeClient(existing = []) {
  const calls = []
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql: String(sql), params })
      if (String(sql).startsWith('SELECT id, checksum')) return { rows: existing }
      return { rows: [] }
    },
  }
}

describe('SQL migration runner', () => {
  it('applies unapplied migrations in order and records their checksums', async () => {
    const client = fakeClient()
    const applied = await applyMigrations(client, [
      { id: '000', name: '000_base.sql', sql: 'SELECT 1', checksum: 'a'.repeat(64) },
      { id: '001', name: '001_event.sql', sql: 'SELECT 2', checksum: 'b'.repeat(64) },
    ])
    expect(applied).toEqual(['000_base.sql', '001_event.sql'])
    expect(client.calls.map((call) => call.sql)).toEqual(expect.arrayContaining(['BEGIN', 'SELECT 1', 'SELECT 2', 'COMMIT']))
    expect(client.calls.filter((call) => call.sql.startsWith('INSERT INTO schema_migrations'))).toHaveLength(2)
  })

  it('does not rerun applied SQL and stops if an applied file was edited', async () => {
    const migration = { id: '000', name: '000_base.sql', sql: 'SELECT 1', checksum: 'a'.repeat(64) }
    const current = fakeClient([{ id: '000', checksum: migration.checksum }])
    await expect(applyMigrations(current, [migration])).resolves.toEqual([])
    expect(current.calls.some((call) => call.sql === 'SELECT 1')).toBe(false)

    const changed = fakeClient([{ id: '000', checksum: 'b'.repeat(64) }])
    await expect(applyMigrations(changed, [migration])).rejects.toThrow('Checksum mismatch')
  })
})
