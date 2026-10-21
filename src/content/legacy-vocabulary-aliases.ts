/**
 * V1 used these hand-authored IDs before the complete HSK 2.0 source catalogue
 * was introduced. Keep the mapping explicit for one-way migration only.
 */
export const legacyVocabularyAliases = [
  { legacyId: 'hsk4-jingyan', hanzi: '经验' },
  { legacyId: 'hsk4-jixu', hanzi: '继续' },
  { legacyId: 'hsk4-jingchang', hanzi: '经常' },
  { legacyId: 'hsk4-jingji', hanzi: '经济' },
  { legacyId: 'hsk4-jingli', hanzi: '经历' },
  { legacyId: 'hsk4-fuza', hanzi: '复杂' },
  { legacyId: 'hsk4-fuzhe', hanzi: '负责' },
  { legacyId: 'hsk4-shiying', hanzi: '适应' },
  { legacyId: 'hsk4-yuanyin', hanzi: '原因' },
  { legacyId: 'hsk4-tongguo', hanzi: '通过' },
  { legacyId: 'hsk4-jiashi', hanzi: '即使' },
] as const
