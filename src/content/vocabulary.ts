import { pinyin } from 'pinyin-pro'
import { hsk2Hsk4Inventory } from './hsk4-2015'
import { hsk2Metadata } from './hsk2-2015-metadata'
import { hsk2VietnameseGlossesLevel1And2 } from './hsk2-vi-glosses-1-2'
import { hsk2VietnameseGlossesLevel3 } from './hsk2-vi-glosses-3'
import { hsk2VietnameseGlossesLevel4a } from './hsk2-vi-glosses-4a'
import { hsk2ExampleSentences } from './hsk2-example-sentences'

export type PartOfSpeech = 'Danh từ' | 'Động từ' | 'Tính từ' | 'Phó từ' | 'Liên từ' | 'Lượng từ' | 'Cụm cố định' | 'Chưa phân loại'

export type Vocabulary = {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  partOfSpeech: PartOfSpeech
  topic: string
  difficulty: 1 | 2 | 3
  example: string
  translation: string
  grammarId?: string
  sourceIndex?: number
  officialLabel?: string
  introducedAtLevel?: 1 | 2 | 3 | 4
  contentStatus?: 'curated' | 'sourced'
}

const curatedVocabulary: Vocabulary[] = [
  {
    id: 'hsk4-jingyan', hanzi: '经验', pinyin: 'jīngyàn', meaning: 'kinh nghiệm', partOfSpeech: 'Danh từ', topic: 'Công việc', difficulty: 2,
    example: '他有丰富的工作经验。', translation: 'Anh ấy có kinh nghiệm làm việc phong phú.', grammarId: 'suiran-danshi',
  },
  {
    id: 'hsk4-jianyì', hanzi: '建议', pinyin: 'jiànyì', meaning: 'đề nghị; kiến nghị', partOfSpeech: 'Động từ', topic: 'Giao tiếp', difficulty: 2,
    example: '我建议你每天复习生词。', translation: 'Tôi đề nghị bạn ôn từ mới mỗi ngày.',
  },
  {
    id: 'hsk4-jixu', hanzi: '继续', pinyin: 'jìxù', meaning: 'tiếp tục', partOfSpeech: 'Động từ', topic: 'Học tập', difficulty: 1,
    example: '休息以后，我们继续学习吧。', translation: 'Nghỉ xong, chúng ta tiếp tục học nhé.',
  },
  {
    id: 'hsk4-jingchang', hanzi: '经常', pinyin: 'jīngcháng', meaning: 'thường xuyên', partOfSpeech: 'Phó từ', topic: 'Đời sống', difficulty: 1,
    example: '她经常坐地铁去上班。', translation: 'Cô ấy thường xuyên đi tàu điện ngầm đến chỗ làm.',
  },
  {
    id: 'hsk4-jingji', hanzi: '经济', pinyin: 'jīngjì', meaning: 'kinh tế; tiết kiệm', partOfSpeech: 'Danh từ', topic: 'Xã hội', difficulty: 3,
    example: '这个办法比较经济。', translation: 'Cách này khá tiết kiệm.',
  },
  {
    id: 'hsk4-jingli', hanzi: '经历', pinyin: 'jīnglì', meaning: 'trải nghiệm; từng trải qua', partOfSpeech: 'Danh từ', topic: 'Đời sống', difficulty: 2,
    example: '这是一段难忘的经历。', translation: 'Đây là một trải nghiệm khó quên.',
  },
  {
    id: 'hsk4-fuza', hanzi: '复杂', pinyin: 'fùzá', meaning: 'phức tạp', partOfSpeech: 'Tính từ', topic: 'Công việc', difficulty: 2,
    example: '这个问题没有你想得那么复杂。', translation: 'Vấn đề này không phức tạp như bạn nghĩ.',
  },
  {
    id: 'hsk4-fuzhe', hanzi: '负责', pinyin: 'fùzé', meaning: 'chịu trách nhiệm', partOfSpeech: 'Động từ', topic: 'Công việc', difficulty: 2,
    example: '谁负责这个项目？', translation: 'Ai chịu trách nhiệm dự án này?',
  },
  {
    id: 'hsk4-shiying', hanzi: '适应', pinyin: 'shìyìng', meaning: 'thích nghi', partOfSpeech: 'Động từ', topic: 'Đời sống', difficulty: 3,
    example: '他很快适应了新的生活。', translation: 'Anh ấy nhanh chóng thích nghi với cuộc sống mới.',
  },
  {
    id: 'hsk4-yuanyin', hanzi: '原因', pinyin: 'yuányīn', meaning: 'nguyên nhân', partOfSpeech: 'Danh từ', topic: 'Giao tiếp', difficulty: 1,
    example: '你知道迟到的原因吗？', translation: 'Bạn biết nguyên nhân đến muộn không?',
  },
  {
    id: 'hsk4-tongguo', hanzi: '通过', pinyin: 'tōngguò', meaning: 'thông qua; vượt qua', partOfSpeech: 'Động từ', topic: 'Học tập', difficulty: 2,
    example: '我希望能通过这次考试。', translation: 'Tôi hy vọng có thể vượt qua kỳ thi lần này.',
  },
  {
    id: 'hsk4-jiashi', hanzi: '即使', pinyin: 'jíshǐ', meaning: 'cho dù; dù cho', partOfSpeech: 'Liên từ', topic: 'Ngữ pháp', difficulty: 3,
    example: '即使下雨，我们也要出发。', translation: 'Dù trời mưa, chúng tôi cũng phải xuất phát.', grammarId: 'jishi-ye',
  },
]

const curatedVocabularyByHanzi = new Map(curatedVocabulary.map((word) => [word.hanzi, word]))
const officialPinyin: Record<string, string> = {
  '得（dei）': 'děi',
  '等（助）': 'děng',
  '对（形）': 'duì',
  '过（动）': 'guò',
}
const vietnameseGlosses = {
  ...hsk2VietnameseGlossesLevel1And2,
  ...hsk2VietnameseGlossesLevel3,
  ...hsk2VietnameseGlossesLevel4a,
}
const sourceIndexVietnameseGlosses: Record<number, string> = {
  333: 'lớn lên; trưởng thành',
  402: 'trả lại',
  585: 'cái; con (lượng từ)',
  1163: 'chỉ; chỉ có',
}
const officialLabelVietnameseGlosses: Record<string, string> = {
  '得（dei）': 'phải; cần',
  '等（助）': 'vân vân; và những thứ tương tự',
  '对（形）': 'đúng; chính xác',
  '过（动）': 'trải qua; đi qua',
}
const fallbackPartOfSpeech: Record<string, PartOfSpeech> = {
  '不客气': 'Cụm cố định',
  '点': 'Danh từ',
  '分钟': 'Danh từ',
  '喝': 'Động từ',
  '和': 'Liên từ',
  '年': 'Danh từ',
  '岁': 'Danh từ',
  '次': 'Lượng từ',
  '打篮球': 'Động từ',
  '公共汽车': 'Danh từ',
  '踢足球': 'Động từ',
  '层': 'Lượng từ',
  '春': 'Danh từ',
  '电子邮件': 'Danh từ',
  '冬': 'Danh từ',
  '刮风': 'Động từ',
  '秋': 'Danh từ',
  '刷牙': 'Động từ',
  '夏': 'Danh từ',
  '一会儿': 'Danh từ',
  '遍': 'Lượng từ',
  '场': 'Lượng từ',
  '弹钢琴': 'Động từ',
  '顿': 'Lượng từ',
  '而': 'Liên từ',
  '翻译': 'Động từ',
  '放暑假': 'Động từ',
  '富': 'Tính từ',
  '趟': 'Lượng từ',
  '于是': 'Liên từ',
  '圆': 'Tính từ',
  '著名': 'Tính từ',
  '做生意': 'Động từ',
}

/**
 * The complete, cumulative HSK 4 catalogue. Every entry has a contextual example;
 * provenance for the sourced examples is documented in DATA_SOURCES.md.
 */
export const vocabulary: Vocabulary[] = hsk2Hsk4Inventory.map((item) => {
  const curated = curatedVocabularyByHanzi.get(item.hanzi)
  if (curated) {
    return {
      ...curated,
      sourceIndex: item.sourceIndex,
      officialLabel: item.officialLabel,
      introducedAtLevel: item.introducedAtLevel,
      contentStatus: 'curated',
    }
  }
  const metadata = hsk2Metadata[item.hanzi]
  const vietnameseGloss = sourceIndexVietnameseGlosses[item.sourceIndex]
    ?? officialLabelVietnameseGlosses[item.officialLabel]
    ?? vietnameseGlosses[item.hanzi]
  if (!vietnameseGloss) {
    throw new Error(`Missing Vietnamese gloss for HSK 2.0 item #${item.sourceIndex}: ${item.officialLabel}`)
  }
  const example = hsk2ExampleSentences[item.sourceIndex]
  if (!example) {
    throw new Error(`Missing example sentence for HSK 2.0 item #${item.sourceIndex}: ${item.officialLabel}`)
  }
  return {
    id: item.id,
    hanzi: item.hanzi,
    pinyin: officialPinyin[item.officialLabel] ?? metadata?.pinyin ?? pinyin(item.hanzi, { toneType: 'symbol' }),
    meaning: vietnameseGloss,
    partOfSpeech: fallbackPartOfSpeech[item.officialLabel]
      ?? fallbackPartOfSpeech[item.hanzi]
      ?? (metadata?.partOfSpeech as PartOfSpeech | undefined)
      ?? 'Chưa phân loại',
    topic: 'Danh mục chuẩn HSK 2.0',
    difficulty: 2,
    example,
    translation: '',
    sourceIndex: item.sourceIndex,
    officialLabel: item.officialLabel,
    introducedAtLevel: item.introducedAtLevel,
    contentStatus: 'sourced',
  }
})
