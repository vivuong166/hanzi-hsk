// Compatibility facade for the V1 application. New V2 code imports from
// content modules directly so authoring data is no longer coupled to the
// vocabulary import pipeline in this module.
export { vocabulary, type PartOfSpeech, type Vocabulary } from './content/vocabulary'
export { grammar, type GrammarPoint } from './content/grammar'
export { exercises, type Exercise } from './content/practice'
export const levels = [
  { id: 'HSK 1', status: 'Đang chuẩn bị' },
  { id: 'HSK 2', status: 'Đang chuẩn bị' },
  { id: 'HSK 3', status: 'Đang chuẩn bị' },
  { id: 'HSK 4', status: 'Có nội dung' },
  { id: 'HSK 5', status: 'Đang chuẩn bị' },
  { id: 'HSK 6', status: 'Đang chuẩn bị' },
] as const
