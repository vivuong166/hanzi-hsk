import { describe, expect, it } from 'vitest'
import { exercises as legacyExercises, grammar as legacyGrammar, vocabulary as legacyVocabulary } from '../data'
import { grammar } from './grammar'
import { exercises } from './practice'
import { vocabulary } from './vocabulary'

describe('legacy content facade', () => {
  it('preserves V1 imports while V2 reads domain modules directly', () => {
    expect(legacyVocabulary).toBe(vocabulary)
    expect(legacyGrammar).toBe(grammar)
    expect(legacyExercises).toBe(exercises)
  })
})
