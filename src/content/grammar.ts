/** Authoring source for grammar lessons with stable IDs for future completion records. */
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
]

export type GrammarContentIssue = {
  code: 'duplicate_id' | 'missing_field' | 'missing_examples'
  message: string
  grammarId?: string
}

export type GrammarContentValidationReport = {
  grammarCount: number
  isValid: boolean
  issues: GrammarContentIssue[]
}

export function validateGrammarContent(items: readonly GrammarPoint[] = grammar): GrammarContentValidationReport {
  const issues: GrammarContentIssue[] = []
  const knownIds = new Set<string>()

  for (const point of items) {
    if (knownIds.has(point.id)) {
      issues.push({ code: 'duplicate_id', grammarId: point.id, message: `Duplicate grammar ID: ${point.id}` })
    }
    knownIds.add(point.id)

    if (!point.id || !point.title || !point.meaning || !point.category || !point.structure || !point.explanation || !point.mistake) {
      issues.push({ code: 'missing_field', grammarId: point.id, message: `Grammar point ${point.id} is missing required learner-facing content.` })
    }

    if (point.examples.length === 0 || point.examples.some((example) => !example.chinese || !example.vietnamese)) {
      issues.push({ code: 'missing_examples', grammarId: point.id, message: `Grammar point ${point.id} must include complete bilingual examples.` })
    }
  }

  return { grammarCount: items.length, isValid: issues.length === 0, issues }
}

export const grammarContentValidationReport = validateGrammarContent()
