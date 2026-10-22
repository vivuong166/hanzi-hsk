import { getVocabularySearchKey, listVocabulary, type CurriculumVocabulary } from './curriculum'

export type DictionaryMatchKind = 'exact' | 'prefix' | 'contains'

export type DictionaryResult = {
  word: CurriculumVocabulary
  match: DictionaryMatchKind
}

export type DictionaryLookup = {
  query: string
  total: number
  results: DictionaryResult[]
}

/**
 * This is deliberately a provider boundary, not a thin client around an
 * unlicensed third-party dictionary endpoint. The first provider is the
 * versioned HSK catalogue already shipped with HANZI, so lookups work without
 * a secret, an account, or a network request.
 */
export const hskLocalDictionary = {
  id: 'hsk-2.0-2015-local',
  label: 'Từ điển HSK 2.0 / 2015 trong ứng dụng',
  scope: '1.200 mục từ HSK 1–4',
  mode: 'local' as const,
  supportsVietnameseDefinitions: true,
}

function getMatchKind(word: CurriculumVocabulary, rawQuery: string, normalizedQuery: string): DictionaryMatchKind {
  const raw = rawQuery.trim()
  const normalizedFields = [word.hanzi, word.officialLabel ?? '', word.pinyin, word.meaning]
    .map(getVocabularySearchKey)

  if (word.hanzi === raw || word.officialLabel === raw || normalizedFields.some((field) => field === normalizedQuery)) return 'exact'
  if (normalizedFields.some((field) => field.startsWith(normalizedQuery))) return 'prefix'
  return 'contains'
}

const matchOrder: Record<DictionaryMatchKind, number> = { exact: 0, prefix: 1, contains: 2 }

/**
 * Searches Hanzi, Pinyin (with or without tones), and Vietnamese glosses in
 * the local HSK catalogue. An empty query intentionally returns no results:
 * it is a dictionary, not an invented recommendation feed.
 */
export function lookupHskDictionary(query: string, limit = 24): DictionaryLookup {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return { query: '', total: 0, results: [] }

  const normalizedQuery = getVocabularySearchKey(trimmedQuery)
  const matches = listVocabulary({ query: trimmedQuery }).items
    .map((word) => ({ word, match: getMatchKind(word, trimmedQuery, normalizedQuery) }))
    .sort((left, right) => matchOrder[left.match] - matchOrder[right.match] || (left.word.sourceIndex ?? Number.MAX_SAFE_INTEGER) - (right.word.sourceIndex ?? Number.MAX_SAFE_INTEGER))

  return { query: trimmedQuery, total: matches.length, results: matches.slice(0, limit) }
}
