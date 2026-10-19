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

grammar.push(
  {
    id: 'bu-jin-erqie', title: '不仅……而且……', meaning: 'Không những… mà còn…', category: 'Câu phức', structure: '不仅 + vế A，(而且) + vế B',
    explanation: 'Nối hai thông tin cùng chiều; vế sau thường được nhấn mạnh hơn.', examples: [{ chinese: '他不仅会说中文，而且会说日语。', vietnamese: 'Anh ấy không những biết nói tiếng Trung mà còn biết nói tiếng Nhật.' }, { chinese: '这家饭馆不仅便宜，而且很好吃。', vietnamese: 'Nhà hàng này không những rẻ mà còn ngon.' }], mistake: 'Không dùng để nối hai ý đối lập; trường hợp đó dùng 虽然……但是…….',
  },
  {
    id: 'chule-yiwai', title: '除了……以外……', meaning: 'Ngoài… ra…', category: 'Liên từ', structure: '除了 + danh từ/việc + 以外，……',
    explanation: 'Nêu một ngoại lệ hoặc thêm một đối tượng khác vào phạm vi nói tới.', examples: [{ chinese: '除了中文以外，他还会说英语。', vietnamese: 'Ngoài tiếng Trung ra, anh ấy còn biết nói tiếng Anh.' }, { chinese: '除了我以外，大家都到了。', vietnamese: 'Ngoài tôi ra, mọi người đều đã đến.' }], mistake: 'Phân biệt 还 (bổ sung) và 都 (phạm vi còn lại).',
  },
  {
    id: 'zhiyao-jiu', title: '只要……就……', meaning: 'Chỉ cần… thì…', category: 'Điều kiện', structure: '只要 + điều kiện đủ， 就 + kết quả',
    explanation: 'Diễn tả một điều kiện là đủ để kết quả xảy ra.', examples: [{ chinese: '只要你努力，就会进步。', vietnamese: 'Chỉ cần bạn cố gắng thì sẽ tiến bộ.' }, { chinese: '只要有时间，我就去看你。', vietnamese: 'Chỉ cần có thời gian, tôi sẽ đi thăm bạn.' }], mistake: 'Không nhầm với 只有……才……, vốn nhấn mạnh điều kiện cần.',
  },
  {
    id: 'yibian-yibian', title: '一边……一边……', meaning: 'Vừa… vừa…', category: 'Thời gian', structure: '一边 + động từ A，一边 + động từ B',
    explanation: 'Hai hành động diễn ra đồng thời, thường do cùng một chủ thể thực hiện.', examples: [{ chinese: '她一边听音乐，一边做作业。', vietnamese: 'Cô ấy vừa nghe nhạc vừa làm bài tập.' }, { chinese: '他一边走，一边打电话。', vietnamese: 'Anh ấy vừa đi vừa gọi điện.' }], mistake: 'Không dùng cho hai hành động không thể đồng thời diễn ra.',
  },
  {
    id: 'yuelaiyue', title: '越来越……', meaning: 'Ngày càng…', category: 'Mức độ', structure: '越来越 + tính từ / động từ trạng thái',
    explanation: 'Biểu thị sự thay đổi tăng dần theo thời gian.', examples: [{ chinese: '我的中文越来越好。', vietnamese: 'Tiếng Trung của tôi ngày càng tốt hơn.' }, { chinese: '天气越来越冷了。', vietnamese: 'Thời tiết ngày càng lạnh.' }], mistake: 'Sau 越来越 thường không dùng 比.',
  },
  {
    id: 'lian-dou', title: '连……都/也……', meaning: 'Ngay cả… cũng…', category: 'Nhấn mạnh', structure: '连 + thành phần được nhấn mạnh + 都/也 + vị ngữ',
    explanation: 'Nhấn mạnh một trường hợp cực đoan hoặc bất ngờ trong phạm vi câu.', examples: [{ chinese: '他太忙了，连饭都没吃。', vietnamese: 'Anh ấy bận đến mức ngay cả cơm cũng chưa ăn.' }, { chinese: '这个字太难了，我连老师也问了。', vietnamese: 'Chữ này quá khó, tôi ngay cả thầy giáo cũng đã hỏi.' }], mistake: '都/也 phải đứng trước vị ngữ, không đứng ngay sau 连.',
  },
  {
    id: 'dui-laishuo', title: '对……来说……', meaning: 'Đối với… mà nói…', category: 'Giới từ', structure: '对 + người/sự việc + 来说，……',
    explanation: 'Giới hạn nhận xét vào góc nhìn hoặc đối tượng cụ thể.', examples: [{ chinese: '对初学者来说，这本书有点儿难。', vietnamese: 'Đối với người mới học, quyển sách này hơi khó.' }, { chinese: '对我来说，健康最重要。', vietnamese: 'Đối với tôi mà nói, sức khỏe là quan trọng nhất.' }], mistake: 'Không cần lặp 来说 khi ngữ cảnh đã rất rõ, nhưng dùng đủ cấu trúc sẽ tự nhiên hơn.',
  },
  {
    id: 'youyu-yinci', title: '由于……因此……', meaning: 'Do… nên…', category: 'Nguyên nhân – kết quả', structure: '由于 + nguyên nhân，因此 + kết quả',
    explanation: 'Cách nối trang trọng hơn 因为……所以……; hay gặp trong văn viết.', examples: [{ chinese: '由于下雨，因此比赛取消了。', vietnamese: 'Do trời mưa nên trận đấu đã bị hủy.' }, { chinese: '由于他生病了，因此没有来上课。', vietnamese: 'Do anh ấy bị ốm nên không đến lớp.' }], mistake: 'Tránh dùng quá nhiều liên từ nguyên nhân trong cùng một câu.',
  },
  {
    id: 'jiran-jiu', title: '既然……就……', meaning: 'Đã… thì…', category: 'Câu phức', structure: '既然 + sự việc đã thừa nhận， 就 + quyết định/kết luận',
    explanation: 'Dựa trên một sự thật được cả hai bên chấp nhận để rút ra hành động hoặc kết luận.', examples: [{ chinese: '既然你累了，就早点儿休息吧。', vietnamese: 'Đã mệt rồi thì nghỉ sớm đi.' }, { chinese: '既然决定了，就不要再担心。', vietnamese: 'Đã quyết định rồi thì đừng lo nữa.' }], mistake: 'Vế đầu thường là điều đã biết, không phải giả định xa vời.',
  },
  {
    id: 'jinguan-haishi', title: '尽管……还是……', meaning: 'Mặc dù… vẫn…', category: 'Câu phức', structure: '尽管 + sự thật，还是 + kết quả',
    explanation: 'Nêu trở ngại có thật nhưng kết quả ở vế sau vẫn không thay đổi.', examples: [{ chinese: '尽管很累，他还是坚持跑步。', vietnamese: 'Mặc dù rất mệt, anh ấy vẫn kiên trì chạy bộ.' }, { chinese: '尽管下雨，我们还是出发了。', vietnamese: 'Mặc dù mưa, chúng tôi vẫn xuất phát.' }], mistake: '尽管 thường đi với 还是, không đi với 也.',
  },
  {
    id: 'yuqi-buru', title: '与其……不如……', meaning: 'Thà… còn hơn…', category: 'So sánh lựa chọn', structure: '与其 + lựa chọn A，不如 + lựa chọn B',
    explanation: 'So sánh hai lựa chọn và khuyên ưu tiên phương án B.', examples: [{ chinese: '与其等别人，不如自己先做。', vietnamese: 'Thà tự làm trước còn hơn chờ người khác.' }, { chinese: '与其坐车，不如走路去。', vietnamese: 'Thà đi bộ còn hơn đi xe.' }], mistake: 'B không phải là so sánh hơn kém thông thường mà là lựa chọn được khuyên làm.',
  },
  {
    id: 'bei-sentence', title: 'Câu bị động 被', meaning: 'Nêu người/vật chịu tác động', category: 'Cấu trúc câu', structure: 'Chủ ngữ + 被 + tác nhân + động từ + kết quả',
    explanation: 'Dùng khi muốn nhấn mạnh đối tượng chịu tác động; kết quả thường rõ ràng hoặc không mong muốn.', examples: [{ chinese: '我的手机被别人拿走了。', vietnamese: 'Điện thoại của tôi bị người khác lấy mất.' }, { chinese: '这本书被他看完了。', vietnamese: 'Quyển sách này đã được anh ấy đọc xong.' }], mistake: 'Không bắt buộc phải nêu tác nhân sau 被 nếu không biết hoặc không cần nhấn mạnh.',
  },
)

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
