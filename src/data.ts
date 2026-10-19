import { pinyin } from 'pinyin-pro'
import { hsk2Hsk4Inventory } from './content/hsk4-2015'
import { hsk2Metadata } from './content/hsk2-2015-metadata'
import { hsk2VietnameseGlossesLevel1And2 } from './content/hsk2-vi-glosses-1-2'
import { hsk2VietnameseGlossesLevel3 } from './content/hsk2-vi-glosses-3'
import { hsk2VietnameseGlossesLevel4a } from './content/hsk2-vi-glosses-4a'
import { hsk2ExampleSentences } from './content/hsk2-example-sentences'

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

export type GrammarPoint = {
  id: string
  title: string
  meaning: string
  category: string
  structure: string
  explanation: string
  examples: Array<{ chinese: string; vietnamese: string }>
  mistake: string
  comparison?: string
}

export type Exercise = {
  id: string
  type: 'choice' | 'order' | 'fill'
  title: string
  prompt: string
  options?: string[]
  answer: string | string[]
  explanation: string
  tags: string[]
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

export const grammar: GrammarPoint[] = [
  {
    id: 'suiran-danshi', title: '虽然……但是……', meaning: 'Mặc dù… nhưng…', category: 'Câu phức',
    structure: '虽然 + mệnh đề A，但是 + mệnh đề B',
    explanation: 'Dùng để biểu đạt sự tương phản giữa hai tình huống. “但是” có thể được lược bỏ trong văn nói khi ngữ cảnh đã rõ.',
    examples: [
      { chinese: '虽然今天很累，但是我还要学习中文。', vietnamese: 'Mặc dù hôm nay rất mệt, nhưng tôi vẫn phải học tiếng Trung.' },
      { chinese: '虽然下雨，他还是准时到了。', vietnamese: 'Mặc dù mưa, anh ấy vẫn đến đúng giờ.' },
      { chinese: '虽然这个问题复杂，我们可以慢慢解决。', vietnamese: 'Mặc dù vấn đề này phức tạp, chúng ta có thể giải quyết từ từ.' },
    ],
    mistake: 'Không dùng 虽然 để nối hai vế không có quan hệ tương phản.', comparison: 'So với 即使……也……: 虽然 nói về sự việc đã biết/có thật; 即使 diễn đạt giả định hoặc nhấn mạnh mức độ.',
  },
  {
    id: 'jishi-ye', title: '即使……也……', meaning: 'Cho dù… cũng…', category: 'Câu phức',
    structure: '即使 + tình huống giả định，也 + kết quả không thay đổi',
    explanation: 'Nhấn mạnh rằng kết quả ở vế sau vẫn không thay đổi, bất kể điều kiện ở vế trước.',
    examples: [
      { chinese: '即使很忙，我也会复习。', vietnamese: 'Dù rất bận, tôi cũng sẽ ôn tập.' },
      { chinese: '即使失败了，也不要放弃。', vietnamese: 'Dù thất bại cũng đừng từ bỏ.' },
      { chinese: '即使没有经验，他也愿意尝试。', vietnamese: 'Dù không có kinh nghiệm, anh ấy vẫn sẵn lòng thử.' },
    ],
    mistake: 'Không thay 也 bằng 但是; hai cấu trúc này có chức năng khác nhau.', comparison: 'So sánh với 虽然……但是…… ở bài liên quan.',
  },
  {
    id: 'ba-sentence', title: 'Câu chữ 把', meaning: 'Đưa tân ngữ chịu tác động lên trước động từ', category: 'Cấu trúc câu',
    structure: 'Chủ ngữ + 把 + tân ngữ + động từ + thành phần bổ sung',
    explanation: 'Dùng khi hành động xử lý hoặc làm thay đổi một đối tượng cụ thể. Sau động từ thường có kết quả, hướng hoặc lượng từ.',
    examples: [
      { chinese: '请把门关上。', vietnamese: 'Hãy đóng cửa lại.' },
      { chinese: '我把作业做完了。', vietnamese: 'Tôi đã làm xong bài tập.' },
      { chinese: '她把书放在桌子上。', vietnamese: 'Cô ấy đặt sách lên bàn.' },
    ],
    mistake: 'Không dùng 把 khi tân ngữ không xác định hoặc hành động không tạo ra kết quả rõ ràng.',
  },
  {
    id: 'cai-jiu', title: '才 và 就', meaning: 'Muộn/ít vs. sớm/nhanh hoặc nhấn mạnh', category: 'Thời gian',
    structure: '…才… / …就…',
    explanation: '才 thường nhấn mạnh muộn, ít hoặc phải sau một điều kiện; 就 thường nhấn mạnh sớm, nhanh hoặc điều kiện đơn giản.',
    examples: [
      { chinese: '他晚上十点才下班。', vietnamese: 'Anh ấy 10 giờ tối mới tan làm.' },
      { chinese: '我八点就到了。', vietnamese: 'Tôi 8 giờ đã đến rồi.' },
      { chinese: '看了三遍，我才明白。', vietnamese: 'Xem ba lần tôi mới hiểu.' },
    ],
    mistake: 'Đừng chỉ hiểu là “mới” và “đã”; hãy xét sắc thái thời gian hoặc điều kiện trong cả câu.',
  },
]

export const exercises: Exercise[] = [
  {
    id: 'ex-suiran-1', type: 'choice', title: 'Dùng liên từ', prompt: 'Chọn từ phù hợp: ___ 今天很累，但是我还要学习中文。',
    options: ['虽然', '因为', '如果', '除了'], answer: '虽然', explanation: '虽然 mở đầu vế nêu sự tương phản; vế sau dùng 但是.', tags: ['虽然……但是……'],
  },
  {
    id: 'ex-jingyan-1', type: 'choice', title: 'Hiểu nghĩa từ', prompt: '“经验” có nghĩa là gì?',
    options: ['Kinh nghiệm', 'Lý do', 'Kinh tế', 'Đề nghị'], answer: 'Kinh nghiệm', explanation: '经验 (jīngyàn) là kinh nghiệm hoặc trải nghiệm tích lũy.', tags: ['Từ vựng', 'Công việc'],
  },
  {
    id: 'ex-ba-1', type: 'order', title: 'Sắp xếp câu', prompt: 'Sắp xếp các từ để tạo câu đúng.',
    options: ['我', '把', '作业', '做完了'], answer: ['我', '把', '作业', '做完了'], explanation: 'Trong câu 把, tân ngữ 作业 được đặt sau 把; 做完了 cho biết kết quả hành động.', tags: ['Câu chữ 把'],
  },
  {
    id: 'ex-cai-1', type: 'fill', title: 'Chọn 才 hoặc 就', prompt: '他晚上十点___下班。',
    options: ['才', '就'], answer: '才', explanation: 'Tan làm lúc 10 giờ tối được xem là muộn, nên dùng 才.', tags: ['才 và 就'],
  },
]

export const levels = [
  { id: 'HSK 1', status: 'Đang chuẩn bị' },
  { id: 'HSK 2', status: 'Đang chuẩn bị' },
  { id: 'HSK 3', status: 'Đang chuẩn bị' },
  { id: 'HSK 4', status: 'Có nội dung' },
  { id: 'HSK 5', status: 'Đang chuẩn bị' },
  { id: 'HSK 6', status: 'Đang chuẩn bị' },
] as const
