import { describe, expect, it } from 'vitest'
import { hskLocalDictionary, lookupHskDictionary } from './dictionary'

describe('local HSK dictionary', () => {
  it('returns an exact Chinese word with its stable curriculum identity', () => {
    const lookup = lookupHskDictionary('经验')

    expect(lookup.total).toBeGreaterThan(0)
    expect(lookup.results[0]).toMatchObject({
      match: 'exact',
      word: { id: 'hsk4-jingyan', hanzi: '经验', meaning: 'kinh nghiệm' },
    })
  })

  it('normalizes Pinyin and finds Vietnamese definitions locally', () => {
    expect(lookupHskDictionary('jingyan').results.some(({ word }) => word.id === 'hsk4-jingyan')).toBe(true)
    expect(lookupHskDictionary('kinh nghiệm').results.some(({ word }) => word.id === 'hsk4-jingyan')).toBe(true)
  })

  it('does not claim that an empty query is a dictionary result', () => {
    expect(lookupHskDictionary('')).toEqual({ query: '', total: 0, results: [] })
    expect(hskLocalDictionary).toMatchObject({ mode: 'local', supportsVietnameseDefinitions: true })
  })
})
