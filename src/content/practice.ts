/**
 * Authoring source for the small, hand-curated practice set.
 *
 * Keep this separate from the vocabulary import pipeline: attempts will need
 * stable exercise IDs and content versions when persistence is introduced.
 */
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

export type PracticeContentIssue = {
  code: 'duplicate_id' | 'missing_field' | 'invalid_options' | 'answer_not_in_options'
  message: string
  exerciseId?: string
}

export type PracticeContentValidationReport = {
  exerciseCount: number
  isValid: boolean
  issues: PracticeContentIssue[]
}

export function validatePracticeContent(items: readonly Exercise[] = exercises): PracticeContentValidationReport {
  const issues: PracticeContentIssue[] = []
  const knownIds = new Set<string>()

  for (const exercise of items) {
    if (knownIds.has(exercise.id)) {
      issues.push({ code: 'duplicate_id', exerciseId: exercise.id, message: `Duplicate exercise ID: ${exercise.id}` })
    }
    knownIds.add(exercise.id)

    if (!exercise.id || !exercise.title || !exercise.prompt || !exercise.explanation || exercise.tags.length === 0) {
      issues.push({ code: 'missing_field', exerciseId: exercise.id, message: `Exercise ${exercise.id} is missing required learner-facing content.` })
    }

    const options = exercise.options ?? []
    if (options.length < 2 || new Set(options).size !== options.length) {
      issues.push({ code: 'invalid_options', exerciseId: exercise.id, message: `Exercise ${exercise.id} must provide at least two distinct options.` })
      continue
    }

    const answers = Array.isArray(exercise.answer) ? exercise.answer : [exercise.answer]
    if (!answers.every((answer) => options.includes(answer))) {
      issues.push({ code: 'answer_not_in_options', exerciseId: exercise.id, message: `Exercise ${exercise.id} has an answer outside its options.` })
    }
  }

  return { exerciseCount: items.length, isValid: issues.length === 0, issues }
}

export const practiceContentValidationReport = validatePracticeContent()
