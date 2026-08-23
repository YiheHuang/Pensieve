import type { Memory, TimeEchoReport, TimeEchoSection } from '../types'

export type TimeEchoSlideKind = 'cover' | 'overview' | 'emotionMap' | 'emotion' | 'people' | 'places' | 'themes' | 'insights' | 'moment' | 'closing'

export interface TimeEchoSlideStat {
  label: string
  value: number
}

export interface TimeEchoEmotionShare {
  label: string
  value: number
  percentage: number
  color: string
}

export interface TimeEchoSlide {
  id: string
  kind: TimeEchoSlideKind
  kicker: string
  title: string
  body: string
  highlights: string[]
  memoryIds: string[]
  stats?: TimeEchoSlideStat[]
  emotions?: TimeEchoEmotionShare[]
  period?: string
}

export type TimeEchoNavigationResult = number | 'exit'

export function resolveTimeEchoNavigation(index: number, offset: number, length: number): TimeEchoNavigationResult {
  if (length <= 0) return 0
  if (offset > 0 && index >= length - 1) return 'exit'
  return Math.min(Math.max(index + offset, 0), length - 1)
}

function hasContent(section: TimeEchoSection) {
  return !!section.narrative.trim() || section.highlights.some(item => item.trim())
}

const emotionColors: Record<string, string> = {
  欣喜: '#f1c86c', joy: '#f1c86c', joyful: '#f1c86c',
  宁静: '#8bd7e6', calm: '#8bd7e6', serene: '#8bd7e6',
  温暖: '#f09a7b', warmth: '#f09a7b', warm: '#f09a7b',
  怀念: '#b99ae4', nostalgia: '#b99ae4', nostalgic: '#b99ae4',
  勇敢: '#76d2b5', courage: '#76d2b5', brave: '#76d2b5',
  难过: '#8fa9d8', sadness: '#8fa9d8', sad: '#8fa9d8',
}
const fallbackColors = ['#8bd7e6', '#b99ae4', '#f09a7b', '#76d2b5', '#f1c86c', '#8fa9d8']

function emotionShares(counts: Record<string, number>): TimeEchoEmotionShare[] {
  const entries = Object.entries(counts).filter(([, value]) => Number.isFinite(value) && value > 0).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  return entries.map(([label, value], index) => ({
    label, value, percentage: total ? Math.round((value / total) * 100) : 0,
    color: emotionColors[label.trim().toLowerCase()] || fallbackColors[index % fallbackColors.length],
  }))
}

export function buildTimeEchoSlides(report: TimeEchoReport, language: 'zh' | 'en'): TimeEchoSlide[] {
  const en = language === 'en'
  const emotions = emotionShares(report.stats.emotionCounts)
  const slides: TimeEchoSlide[] = [{
    id: 'cover', kind: 'cover', kicker: en ? 'A TIME ECHO' : '一段时光的回响', title: report.title,
    body: en ? 'Scattered glimmers are answering one another beneath the surface.' : '散落的微光，正在水面之下彼此呼应。',
    highlights: [], memoryIds: [], period: `${report.periodStart} — ${report.periodEnd}`,
    stats: [{ label: en ? 'Memories' : '缕记忆', value: report.memoryCount }, { label: en ? 'Active days' : '活跃日', value: report.stats.activeDays }],
    emotions: emotions.slice(0, 4),
  }, {
    id: 'overview', kind: 'overview', kicker: en ? 'THE SHAPE OF THIS CHAPTER' : '这段时光的轮廓',
    title: en ? 'When scattered moments become a whole' : '当散落的片刻汇聚成形', body: report.overview,
    highlights: [], memoryIds: report.sourceMemoryIds,
    stats: [
      { label: en ? 'Memories' : '记忆', value: report.memoryCount },
      { label: en ? 'Active days' : '活跃日', value: report.stats.activeDays },
      { label: en ? 'Attachments' : '附件', value: report.stats.attachmentCount },
      { label: en ? 'Treasured' : '珍贵记忆', value: report.stats.favoriteCount },
    ],
  }]
  if (emotions.length) slides.push({
    id: 'emotion-map', kind: 'emotionMap', kicker: en ? 'THE COLORS BENEATH' : '水下的情绪光谱',
    title: en ? 'Every feeling leaves a color' : '每一种感受，都留下颜色', body: '', highlights: [],
    memoryIds: report.sourceMemoryIds, emotions,
  })
  const sections: Array<[TimeEchoSlideKind, TimeEchoSection, string, string]> = [
    ['emotion', report.emotionalJourney, '情绪轨迹', 'Emotional journey'],
    ['people', report.peopleAndRelationships, '人物与关系', 'People & relationships'],
    ['places', report.placesAndScenes, '地点与场景', 'Places & scenes'],
    ['themes', report.themesAndEvents, '主题与事件', 'Themes & events'],
    ['insights', report.patternsAndInsights, '变化与洞察', 'Patterns & insights'],
  ]
  for (const [kind, section, zhTitle, enTitle] of sections) {
    if (!hasContent(section)) continue
    slides.push({ id: kind, kind, kicker: en ? 'BENEATH THE SURFACE' : '水面之下', title: section.heading.trim() || (en ? enTitle : zhTitle), body: section.narrative, highlights: section.highlights.filter(Boolean), memoryIds: section.memoryIds })
  }
  report.treasuredMoments.forEach((moment, index) => {
    if (!moment.title.trim() && !moment.reflection.trim()) return
    slides.push({ id: `moment-${index}`, kind: 'moment', kicker: en ? 'A MOMENT HELD BY THE WATER' : '被水光留住的片刻', title: moment.title, body: moment.reflection, highlights: [], memoryIds: moment.memoryIds })
  })
  slides.push({ id: 'closing', kind: 'closing', kicker: en ? 'RETURNING TO THE SURFACE' : '浮回水面之前', title: en ? 'Carry the echoes with you' : '让回响陪你继续前行', body: report.closingReflection, highlights: [], memoryIds: [] })
  return slides
}

function normalized(value: string) { return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '') }
function grams(value: string) {
  const compact = normalized(value); const result = new Set<string>()
  if (compact.length < 2) { if (compact) result.add(compact); return result }
  for (let index = 0; index < compact.length - 1; index += 1) result.add(compact.slice(index, index + 2))
  return result
}
function similarity(left: string, right: string) {
  const a = grams(left); const b = grams(right); if (!a.size || !b.size) return 0
  let shared = 0; for (const item of a) if (b.has(item)) shared += 1
  return (2 * shared) / (a.size + b.size)
}

/** Resolves legacy multi-source moments to the memory their title and reflection actually describe. */
export function resolveTimeEchoSourceId(slide: TimeEchoSlide, memories: Map<string, Memory>): string | undefined {
  const slideTitle = normalized(slide.title)
  const exactFromReport = [...memories.values()].find(memory => normalized(memory.title) === slideTitle)
  if (exactFromReport) return exactFromReport.id
  const candidates = slide.memoryIds.map(id => memories.get(id)).filter((memory): memory is Memory => !!memory)
  if (!candidates.length) return undefined
  if (candidates.length === 1) return candidates[0].id
  const signal = `${slide.title}\n${slide.body}`
  return candidates.map(memory => ({ id: memory.id, score: similarity(signal, `${memory.title}\n${memory.content}`) }))
    .sort((a, b) => b.score - a.score)[0]?.id
}
