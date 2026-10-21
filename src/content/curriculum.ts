import { grammar, type GrammarPoint } from './grammar'
import { hsk2Hsk4Inventory, HSK2_2015_HSK4_SOURCE_URL } from './hsk4-2015'
import { exercises, type Exercise } from './practice'
import { type Vocabulary, vocabulary } from './vocabulary'

export const HSK2_2015_CURRICULUM_ID = 'hsk-2.0-2015' as const
export const HSK2_2015_CURRICULUM_VERSION = '2015' as const

export type CurriculumLevel = 1 | 2 | 3 | 4
export type ContentVerificationStatus = 'verified' | 'needs_editorial_review'

export type ContentSource = {
  id: 'chinese-test-hsk2-2015-vocabulary' | 'hanzi-curated-vietnamese'
  label: string
  license: string
  url?: string
}

export type CurriculumVocabulary = Vocabulary & {
  curriculumId: typeof HSK2_2015_CURRICULUM_ID
  curriculumVersion: typeof HSK2_2015_CURRICULUM_VERSION
  level: CurriculumLevel
  introducedLevel: CurriculumLevel
  itemSourceId: string
  verificationStatus: ContentVerificationStatus
  provenance: ContentSource
}

export type VocabularyQuery = {
  curriculumId?: typeof HSK2_2015_CURRICULUM_ID
  level?: CurriculumLevel | 'all'
  query?: string
  limit?: number
}

export type VocabularyPage = {
  items: CurriculumVocabulary[]
  total: number
}

export type ContentValidationIssue = {
  code: 'count' | 'duplicate_id' | 'source_index' | 'level_coverage' | 'missing_field' | 'inventory_mismatch'
  message: string
  itemId?: string
}

export type ContentValidationReport = {
  curriculumId: typeof HSK2_2015_CURRICULUM_ID
  generatedFromStaticContent: true
  isValid: boolean
  vocabularyCount: number
  curatedCount: number
  needsEditorialReviewCount: number
  levelCounts: Record<CurriculumLevel, number>
  issues: ContentValidationIssue[]
}

const sourceCatalogue: ContentSource = {
  id: 'chinese-test-hsk2-2015-vocabulary',
  label: 'Chinese Test — HSK 2.0/2015 vocabulary list',
  license: 'Source catalogue; see DATA_SOURCES.md',
  url: HSK2_2015_HSK4_SOURCE_URL,
}

const curatedVietnamese: ContentSource = {
  id: 'hanzi-curated-vietnamese',
  label: 'HANZI curated Vietnamese learning content',
  license: 'Project-authored; editorial review recorded in content workflow',
}

function normaliseForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/u\u0308/g, 'v')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[1-5]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const catalogueVocabulary: CurriculumVocabulary[] = vocabulary.map((entry) => {
  const introducedLevel = entry.introducedAtLevel
  if (!introducedLevel || !entry.sourceIndex) {
    throw new Error(`HSK 2.0 vocabulary entry ${entry.id} is missing its canonical source mapping.`)
  }
  const editoriallyCurated = entry.contentStatus === 'curated'
  return {
    ...entry,
    curriculumId: HSK2_2015_CURRICULUM_ID,
    curriculumVersion: HSK2_2015_CURRICULUM_VERSION,
    level: introducedLevel,
    introducedLevel,
    itemSourceId: `${HSK2_2015_CURRICULUM_ID}:vocabulary:${entry.sourceIndex}`,
    verificationStatus: editoriallyCurated ? 'verified' : 'needs_editorial_review',
    provenance: editoriallyCurated ? curatedVietnamese : sourceCatalogue,
  }
})

const vocabularyById = new Map(catalogueVocabulary.map((entry) => [entry.id, entry]))
const grammarById = new Map(grammar.map((entry) => [entry.id, entry]))

export const hsk2Curriculum = {
  id: HSK2_2015_CURRICULUM_ID,
  version: HSK2_2015_CURRICULUM_VERSION,
  label: 'HSK 2.0 (2015)',
  availability: 'available' as const,
  levels: [
    { level: 1 as const, introducedWordCount: 150, cumulativeWordCount: 150 },
    { level: 2 as const, introducedWordCount: 150, cumulativeWordCount: 300 },
    { level: 3 as const, introducedWordCount: 300, cumulativeWordCount: 600 },
    { level: 4 as const, introducedWordCount: 600, cumulativeWordCount: 1200 },
  ],
  source: sourceCatalogue,
} as const

export const upcomingCurricula = [
  {
    id: 'hsk-3.0',
    label: 'HSK 3.0',
    availability: 'not_supported' as const,
    reason: 'Chưa có nguồn curriculum được kiểm duyệt trong HANZI V2.',
  },
] as const

export function listVocabulary({ curriculumId = HSK2_2015_CURRICULUM_ID, level = 'all', query = '', limit }: VocabularyQuery = {}): VocabularyPage {
  if (curriculumId !== HSK2_2015_CURRICULUM_ID) return { items: [], total: 0 }
  const needle = normaliseForSearch(query)
  const matching = catalogueVocabulary.filter((entry) => {
    if (level !== 'all' && entry.introducedLevel !== level) return false
    if (!needle) return true
    return normaliseForSearch(`${entry.hanzi} ${entry.pinyin} ${entry.meaning} ${entry.officialLabel ?? ''}`).includes(needle)
  })
  return { items: limit === undefined ? matching : matching.slice(0, limit), total: matching.length }
}

export function getVocabularyById(id: string) {
  return vocabularyById.get(id)
}

export function getGrammarById(id: string) {
  return grammarById.get(id)
}

export function getVocabularySearchKey(value: string) {
  return normaliseForSearch(value)
}

export function validateHsk2Content(): ContentValidationReport {
  const issues: ContentValidationIssue[] = []
  const expectedLevelCounts: Record<CurriculumLevel, number> = { 1: 150, 2: 150, 3: 300, 4: 600 }
  const levelCounts: Record<CurriculumLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const seenIds = new Set<string>()

  if (catalogueVocabulary.length !== 1200 || hsk2Hsk4Inventory.length !== 1200) {
    issues.push({ code: 'count', message: `Expected 1,200 vocabulary entries; received ${catalogueVocabulary.length}.` })
  }

  catalogueVocabulary.forEach((entry, index) => {
    if (seenIds.has(entry.id)) issues.push({ code: 'duplicate_id', itemId: entry.id, message: `Duplicate canonical ID: ${entry.id}.` })
    seenIds.add(entry.id)
    levelCounts[entry.introducedLevel] += 1
    const expectedIndex = index + 1
    if (entry.sourceIndex !== expectedIndex) issues.push({ code: 'source_index', itemId: entry.id, message: `Expected source index ${expectedIndex}; received ${entry.sourceIndex}.` })
    const sourceEntry = hsk2Hsk4Inventory[index]
    if (!sourceEntry || sourceEntry.hanzi !== entry.hanzi || sourceEntry.introducedAtLevel !== entry.introducedLevel) {
      issues.push({ code: 'inventory_mismatch', itemId: entry.id, message: `Entry ${entry.id} no longer matches the canonical inventory.` })
    }
    if (!entry.hanzi || !entry.pinyin || !entry.meaning || !entry.example || !entry.itemSourceId || !entry.provenance.id) {
      issues.push({ code: 'missing_field', itemId: entry.id, message: `Entry ${entry.id} is missing required learner or provenance content.` })
    }
  })

  ;([1, 2, 3, 4] as const).forEach((level) => {
    if (levelCounts[level] !== expectedLevelCounts[level]) {
      issues.push({ code: 'level_coverage', message: `HSK ${level} should introduce ${expectedLevelCounts[level]} entries; received ${levelCounts[level]}.` })
    }
  })

  const curatedCount = catalogueVocabulary.filter((entry) => entry.verificationStatus === 'verified').length
  return {
    curriculumId: HSK2_2015_CURRICULUM_ID,
    generatedFromStaticContent: true,
    isValid: issues.length === 0,
    vocabularyCount: catalogueVocabulary.length,
    curatedCount,
    needsEditorialReviewCount: catalogueVocabulary.length - curatedCount,
    levelCounts,
    issues,
  }
}

export const contentValidationReport = validateHsk2Content()

export { exercises, grammar }
export type { Exercise, GrammarPoint, Vocabulary }
