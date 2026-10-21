import { describe, expect, it } from 'vitest'
import {
  contentValidationReport,
  getVocabularyById,
  getVocabularySearchKey,
  hsk2Curriculum,
  listVocabulary,
  upcomingCurricula,
} from './curriculum'

describe('HSK 2.0/2015 curriculum content', () => {
  it('preserves the complete canonical 1,200-word catalogue', () => {
    expect(contentValidationReport.isValid, JSON.stringify(contentValidationReport.issues)).toBe(true)
    expect(contentValidationReport.vocabularyCount).toBe(1200)
    expect(contentValidationReport.levelCounts).toEqual({ 1: 150, 2: 150, 3: 300, 4: 600 })
    expect(hsk2Curriculum.id).toBe('hsk-2.0-2015')
  })

  it('keeps stable application IDs and canonical provenance discoverable', () => {
    const word = getVocabularyById('hsk4-jingyan')
    expect(word).toMatchObject({
      id: 'hsk4-jingyan',
      curriculumId: 'hsk-2.0-2015',
      curriculumVersion: '2015',
      itemSourceId: expect.stringMatching(/^hsk-2\.0-2015:vocabulary:/),
    })
  })

  it('searches Pinyin tone marks and v/ü input consistently', () => {
    expect(getVocabularySearchKey('lǜ')).toBe(getVocabularySearchKey('lv4'))
    expect(listVocabulary({ query: 'jingyan' }).items.some((word) => word.id === 'hsk4-jingyan')).toBe(true)
  })

  it('does not expose HSK 3.0 as an available curriculum', () => {
    expect(upcomingCurricula).toEqual([expect.objectContaining({ id: 'hsk-3.0', availability: 'not_supported' })])
  })
})
