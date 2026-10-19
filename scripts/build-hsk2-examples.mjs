import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sentenceDataset = path.join(process.env.TEMP ?? '', 'hanzi-hsk-sentences', 'dist', 'sentences.json')
const inventorySource = fs.readFileSync(path.join(projectRoot, 'src', 'content', 'hsk4-2015.ts'), 'utf8')
const labelsBlock = inventorySource.match(/const officialLabels = \[([\s\S]*?)\] as const/)
if (!labelsBlock) throw new Error('Could not parse the HSK 2.0 inventory.')

const inventory = [...labelsBlock[1].matchAll(/'([^']+)'/g)].map((match, index) => ({
  sourceIndex: index + 1,
  hanzi: match[1].replace(/（.*?）/g, '').trim(),
}))
const sourceSentences = JSON.parse(fs.readFileSync(sentenceDataset, 'utf8'))
const sentenceByWord = new Map()
for (const sentence of sourceSentences) {
  for (const token of sentence.tokens ?? []) {
    if (!sentenceByWord.has(token.word)) sentenceByWord.set(token.word, sentence.chinese)
  }
}

// These entries are absent from the imported corpus or need a separate sense
// for a duplicated HSK 2.0 headword. They are deliberately short, single-sense
// learning sentences and are checked before being admitted to the deck.
const editorialExamples = {
  18: '请说不客气。', 49: '我下午六点回家。', 42: '火车站离这里不远。', 123: '孩子们在学校里打篮球。',
  169: '她在比赛中得了第一。', 185: '孩子们在学校里踢足球。', 140: '这家饭馆的羊肉很好吃。',
  313: '他点头表示同意。', 311: '这个办法比那个差一点儿。', 226: '春天来了，花开了。', 267: '冬天很冷，要多穿衣服。',
  380: '外面刮风了，别忘了关窗。', 495: '我想吃一碗面条。', 537: '秋天的天气很凉快。', 553: '我弟弟喜欢数学。',
  605: '夏天我们常去游泳。', 650: '请把行李箱放在门边。', 659: '熊猫喜欢吃竹子。', 670: '他的照相机很新。',
  638: '长江是中国最长的河流。', 336: '她每天晚上弹钢琴。', 684: '瓶子底有一点儿水。', 713: '有烦恼时，可以和朋友聊天。',
  730: '学校下周开始放暑假。', 739: '秋天的空气很干燥。', 782: '一个人在外地生活会觉得孤单。', 800: '她很害羞，不敢说话。',
  827: '那只猴子在树上跳来跳去。', 846: '你咳嗽得很厉害，应该去看医生。', 859: '请把垃圾放进垃圾桶。', 866: '老虎是很危险的动物。',
  883: '我们常在网上聊天。', 891: '听到这个消息，她流泪了。', 909: '做作业不能太马虎。', 924: '中国人很喜欢打乒乓球。',
  940: '过年时，我们去看亲戚。', 989: '狮子住在动物园里。', 996: '下雨以后，地面很湿润。', 1031: '我去商店的时候，顺便买了牛奶。',
  1056: '无论多忙，他每天都学习中文。', 1078: '我很羡慕他的中文说得这么好。', 1095: '我的牙膏快用完了。', 1102: '中国在亚洲东部。',
  1125: '我找不到房间的钥匙。', 1167: '这条路太窄，汽车不能开进去。', 1176: '这是我一生中最重要的事情之一。', 1177: '他指着墙上的照片说话。',
  159: '这条路很长。', 333: '孩子长得很快。', 171: '他说得很清楚。', 682: '我得先回家。',
  172: '请等我一下。', 683: '桌子上有书、笔等东西。', 176: '这个答案不对。', 694: '他的答案是对的。',
  188: '我去过北京。', 762: '他每天要过马路。', 195: '我还想再看一遍。', 402: '请把书还给我。',
  585: '我只喝水。', 1163: '桌子上有一只猫。',
}

Object.assign(editorialExamples, {
  8: '不客气，这是我应该做的。', 41: '我下午六点回家。', 43: '火车站离这里不远。', 167: '孩子们在学校里打篮球。',
  174: '她在比赛中得了第一。', 250: '孩子们在学校里踢足球。', 272: '这家饭馆的羊肉很好吃。', 322: '他点头表示同意。',
  332: '这个办法比那个差一点儿。', 342: '春天来了，花开了。', 360: '冬天很冷，要多穿衣服。', 386: '外面刮风了，别忘了关窗。',
  465: '我想吃一碗面条。', 488: '秋天的天气很凉快。', 506: '我弟弟喜欢数学。', 538: '夏天我们常去游泳。',
  551: '请把行李箱放在门边。', 552: '熊猫喜欢吃竹子。', 584: '他的照相机很新。', 639: '长江是中国最长的河流。',
  672: '她每天晚上弹钢琴。', 684: '瓶子底有一点儿水。', 706: '有烦恼时，可以和朋友聊天。', 715: '学校下周开始放暑假。',
  730: '秋天的空气很干燥。', 746: '一个人在外地生活会觉得孤单。', 765: '她很害羞，不敢说话。', 775: '那只猴子在树上跳来跳去。',
  847: '你咳嗽得很厉害，应该去看医生。', 859: '请把垃圾放进垃圾桶。', 867: '老虎是很危险的动物。', 881: '我们常在网上聊天。',
  883: '听到这个消息，她流泪了。', 891: '做作业不能太马虎。', 920: '中国人很喜欢打乒乓球。', 936: '过年时，我们去看亲戚。',
  962: '森林里有很多高大的树。', 978: '狮子住在动物园里。', 979: '下雨以后，地面很湿润。', 1003: '我去商店的时候，顺便买了牛奶。',
  1052: '无论多忙，他每天都学习中文。', 1062: '我很羡慕他的中文说得这么好。', 1087: '我的牙膏快用完了。', 1088: '中国在亚洲东部。',
  1136: '我找不到房间的钥匙。', 1146: '这条路太窄，汽车不能开进去。', 1156: '这是我一生中最重要的事情之一。', 1166: '他指着墙上的照片说话。',
})
const editorialIndices = new Set([8, 41, 43, 167, 174, 250, 272, 322, 332, 342, 360, 386, 465, 488, 506, 538, 551, 552, 584, 639, 672, 684, 706, 715, 730, 746, 765, 775, 847, 859, 867, 881, 883, 891, 920, 936, 962, 978, 979, 1003, 1052, 1062, 1087, 1088, 1136, 1146, 1156, 1166, 159, 333, 171, 682, 172, 683, 176, 694, 188, 762, 195, 402, 585, 1163])

const examples = Object.fromEntries(inventory.map(({ sourceIndex, hanzi }) => {
  const chinese = editorialIndices.has(sourceIndex) ? editorialExamples[sourceIndex] : sentenceByWord.get(hanzi)
  if (!chinese) throw new Error(`No example for HSK 2.0 entry #${sourceIndex}: ${hanzi}`)
  return [sourceIndex, chinese]
}))

const generated = `/**
 * HSK 2.0 example sentences for the 1,200-word cumulative HSK 4 deck.
 *
 * Imported sentences: hsk-sentences-audio (CC BY-SA 4.0 dataset); see
 * DATA_SOURCES.md and DATA_LICENSE.md. Editorial fallback sentences are
 * identified in scripts/build-hsk2-examples.mjs.
 */
export const hsk2ExampleSentences: Record<number, string> = ${JSON.stringify(examples, null, 2)}\n`
fs.writeFileSync(path.join(projectRoot, 'src', 'content', 'hsk2-example-sentences.ts'), generated)
console.log(`Generated ${Object.keys(examples).length} HSK 2.0 example sentences.`)
