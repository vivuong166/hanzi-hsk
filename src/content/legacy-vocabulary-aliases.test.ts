import { describe, expect, it } from 'vitest'
import { legacyVocabularyAliases } from './legacy-vocabulary-aliases'
import { vocabulary } from './vocabulary'

describe('legacy vocabulary aliases', () => {
  it('maps every V1 curated ID to exactly one canonical vocabulary entry', () => {
    expect(legacyVocabularyAliases).toHaveLength(11)
    for (const alias of legacyVocabularyAliases) {
      expect(vocabulary.filter((word) => word.id === alias.legacyId && word.hanzi === alias.hanzi)).toHaveLength(1)
    }
  })
})
