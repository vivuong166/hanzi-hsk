import { describe, expect, it } from 'vitest'
import { contentManifestValidationReport, hsk2ContentManifest } from './manifest'

describe('HSK 2.0 content manifest', () => {
  it('describes the only supported curriculum and all validated content domains', () => {
    expect(contentManifestValidationReport).toEqual({
      contentRelease: 'hsk-2.0-2015.r1',
      isValid: true,
      invalidDomains: [],
    })
    expect(hsk2ContentManifest).toMatchObject({
      schemaVersion: 1,
      curriculum: { id: 'hsk-2.0-2015', version: '2015' },
      domains: {
        vocabulary: { itemCount: 1200 },
        grammar: { itemCount: 16 },
        practice: { itemCount: 4 },
      },
    })
  })
})
