import { describe, expect, it } from 'vitest'
import type { Memory, TimeEchoReport, TimeEchoSection } from '../types'
import { buildTimeEchoSlides, resolveTimeEchoNavigation, resolveTimeEchoSourceId } from './timeEchoSlides'

const section = (heading: string, narrative: string, ids: string[] = ['m1']): TimeEchoSection => ({ heading, narrative, highlights: narrative ? ['微光'] : [], memoryIds: ids })
function report(): TimeEchoReport {
  return {
    id: 'echo', title: '八月回响', periodStart: '2026-08-01', periodEnd: '2026-08-23', createdAt: '', updatedAt: '', language: 'zh',
    memoryCount: 2, sourceMemoryIds: ['m1', 'm2'], favorite: false,
    stats: { activeDays: 2, attachmentCount: 1, favoriteCount: 1, emotionCounts: { 宁静: 1, 温暖: 1 } }, overview: '一段完整的回望。',
    emotionalJourney: section('情绪轨迹', '情绪缓缓流动。'), peopleAndRelationships: section('人物与关系', '陪伴始终都在。'),
    placesAndScenes: section('地点与场景', '熟悉的湖边。'), themesAndEvents: section('主题与事件', '日常与成长。'), patternsAndInsights: section('变化与洞察', '生活渐渐稳定。'),
    treasuredMoments: [{ title: '湖边晚风', reflection: '一个值得再次凝望的片刻。', memoryIds: ['m2'] }], closingReflection: '带着微光继续前行。',
  }
}

describe('buildTimeEchoSlides', () => {
  it('按封面、概览、五个维度、珍贵片段与结语排列', () => {
    expect(buildTimeEchoSlides(report(), 'zh').map(slide => slide.kind)).toEqual(['cover', 'overview', 'emotionMap', 'emotion', 'people', 'places', 'themes', 'insights', 'moment', 'closing'])
  })

  it('跳过空章节和空珍贵片段，但保留封面、概览与结语', () => {
    const value = report(); value.placesAndScenes = section('', '', []); value.treasuredMoments = [{ title: '', reflection: '', memoryIds: [] }]
    const slides = buildTimeEchoSlides(value, 'zh')
    expect(slides.some(slide => slide.kind === 'places')).toBe(false)
    expect(slides.some(slide => slide.kind === 'moment')).toBe(false)
    expect(slides[0].kind).toBe('cover'); expect(slides.at(-1)?.kind).toBe('closing')
  })

  it('英文界面使用英文引导文本并保留原始报告正文', () => {
    const slides = buildTimeEchoSlides(report(), 'en')
    expect(slides[0].kicker).toBe('A TIME ECHO')
    expect(slides[1].body).toBe('一段完整的回望。')
  })

  it('计算情绪占比并为封面与光谱页提供色彩', () => {
    const slides = buildTimeEchoSlides(report(), 'zh')
    expect(slides[0].emotions).toEqual(expect.arrayContaining([expect.objectContaining({ label: '宁静', percentage: 50 }), expect.objectContaining({ label: '温暖', percentage: 50 })]))
    expect(slides.find(slide => slide.kind === 'emotionMap')?.emotions).toHaveLength(2)
  })
})

describe('resolveTimeEchoSourceId', () => {
  const memory = (id: string, title: string, content: string): Memory => ({ id, title, content, summary: '', occurredAt: '', createdAt: '', updatedAt: '', emotion: '宁静', emotions: ['宁静'], emotionColor: '', status: 'active', tags: [], attachments: [], aiStatus: 'succeeded' })

  it('旧报告的引用 ID 错位时，按片段标题找回真正的原记忆', () => {
    const slide = buildTimeEchoSlides(report(), 'zh').find(item => item.kind === 'moment')!
    slide.memoryIds = ['m1']
    const memories = new Map([['m1', memory('m1', '厨房灯火', '晚餐')], ['m2', memory('m2', '湖边晚风', '湖边散步')]])
    expect(resolveTimeEchoSourceId(slide, memories)).toBe('m2')
  })
})

describe('resolveTimeEchoNavigation', () => {
  it('keeps the reading order linear and exits after the final page', () => {
    expect(resolveTimeEchoNavigation(0, -1, 4)).toBe(0)
    expect(resolveTimeEchoNavigation(1, 1, 4)).toBe(2)
    expect(resolveTimeEchoNavigation(3, 1, 4)).toBe('exit')
  })
})
