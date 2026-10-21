import { contentValidationReport, HSK2_2015_CURRICULUM_ID, HSK2_2015_CURRICULUM_VERSION } from './curriculum'
import { grammar, grammarContentValidationReport } from './grammar'
import { exercises, practiceContentValidationReport } from './practice'
import { vocabulary } from './vocabulary'

/**
 * Version used on attempts/completions once persistence is introduced. It is a
 * project content release, not a claim that HSK 3.0 is available.
 */
export const HSK2_2015_CONTENT_RELEASE = 'hsk-2.0-2015.r1' as const

export const hsk2ContentManifest = {
  schemaVersion: 1,
  contentRelease: HSK2_2015_CONTENT_RELEASE,
  curriculum: {
    id: HSK2_2015_CURRICULUM_ID,
    version: HSK2_2015_CURRICULUM_VERSION,
  },
  domains: {
    vocabulary: {
      itemCount: vocabulary.length,
      source: 'Chinese Test HSK 2.0/2015 catalogue with HANZI Vietnamese enrichment',
    },
    grammar: {
      itemCount: grammar.length,
      source: 'HANZI curated Vietnamese learning content',
    },
    practice: {
      itemCount: exercises.length,
      source: 'HANZI curated Vietnamese learning content',
    },
  },
} as const

export type ContentManifestValidationReport = {
  contentRelease: typeof HSK2_2015_CONTENT_RELEASE
  isValid: boolean
  invalidDomains: Array<'vocabulary' | 'grammar' | 'practice'>
}

export function validateContentManifest(): ContentManifestValidationReport {
  const invalidDomains: ContentManifestValidationReport['invalidDomains'] = []
  if (!contentValidationReport.isValid) invalidDomains.push('vocabulary')
  if (!grammarContentValidationReport.isValid) invalidDomains.push('grammar')
  if (!practiceContentValidationReport.isValid) invalidDomains.push('practice')

  return {
    contentRelease: HSK2_2015_CONTENT_RELEASE,
    isValid: invalidDomains.length === 0,
    invalidDomains,
  }
}

export const contentManifestValidationReport = validateContentManifest()
