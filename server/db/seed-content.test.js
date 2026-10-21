import { describe, expect, it } from 'vitest'
import { loadHsk2Inventory, loadLegacyVocabularyAliases } from './seed-content.js'

describe('HSK 2.0 identity seed', () => {
  it('derives the complete canonical inventory from the shared content source', async () => {
    const inventory = await loadHsk2Inventory()
    expect(inventory).toHaveLength(1200)
    expect(inventory[0]).toMatchObject({ id: 'hsk2-2015-1', sourceIndex: 1, hanzi: '爱', introducedAtLevel: 1 })
    expect(inventory.at(-1)).toMatchObject({ id: 'hsk2-2015-1200', sourceIndex: 1200, introducedAtLevel: 4 })
  })

  it('derives every curated V1 alias from an existing canonical Hanzi entry', async () => {
    const [inventory, aliases] = await Promise.all([loadHsk2Inventory(), loadLegacyVocabularyAliases()])
    expect(aliases).toHaveLength(11)
    expect(aliases.every((alias) => inventory.some((item) => item.hanzi === alias.hanzi))).toBe(true)
  })
})
