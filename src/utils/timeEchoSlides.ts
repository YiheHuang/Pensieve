import type { TimeEchoReport, TimeEchoSection } from '../types'

export type TimeEchoSlideKind = 'cover' | 'overview' | 'emotion' | 'people' | 'places' | 'themes' | 'insights' | 'moment' | 'closing'

export interface TimeEchoSlideStat {
  label: string
  value: number
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

export function buildTimeEchoSlides(report: TimeEchoReport, language: 'zh' | 'en'): TimeEchoSlide[] {
  const en = language === 'en'
  const slides: TimeEchoSlide[] = [{
    id: 'cover', kind: 'cover', kicker: en ? 'A TIME ECHO' : '一段时光的回响', title: report.title,
    body: en ? `${report.memoryCount} memories are waiting beneath the surface.` : `${report.memoryCount} 缕记忆，正在水面之下彼此呼应。`,
    highlights: [], memoryIds: [], period: `${report.periodStart} — ${report.periodEnd}`,
  }, {
    id: 'overview', kind: 'overview', kicker: en ? 'THE SHAPE OF THIS CHAPTER' : '这段时光的轮廓',
    title: en ? 'When scattered moments become a whole' : '当散落的片刻汇聚成形', body: report.overview,
    highlights: [], memoryIds: report.sourceMemoryIds,
    stats: [
      { label: en ? 'Memories' : '记忆', value: report.memoryCount },
      { label: en ? 'Active days' : '活跃日', value: report.stats.activeDays },
      { label: en ? 'Attachments' : '附件', value: report.stats.attachmentCount },
      { label: en ? 'Treasured' : '珍贵记忆', value: report.stats.favoriteCount },
      ...Object.entries(report.stats.emotionCounts).map(([label, value]) => ({ label, value })),
    ],
  }]
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
