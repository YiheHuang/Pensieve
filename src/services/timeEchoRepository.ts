import type { GenerateTimeEchoRequest, Memory, TimeEchoProgress, TimeEchoReport, TimeEchoSection } from '../types'
import { isDesktop, nativeBridge } from './nativeBridge'

export const TIME_ECHO_STORAGE_KEY = 'pensieve.time-echoes.v1'
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function readBrowserTimeEchoes(): TimeEchoReport[] {
  try { return JSON.parse(localStorage.getItem(TIME_ECHO_STORAGE_KEY) || '[]') as TimeEchoReport[] } catch { return [] }
}
export function writeBrowserTimeEchoes(reports: TimeEchoReport[]) { localStorage.setItem(TIME_ECHO_STORAGE_KEY, JSON.stringify(reports)) }

function beijingDate(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso))
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function section(heading: string, narrative: string, memories: Memory[]): TimeEchoSection {
  return { heading, narrative, highlights: memories.slice(0, 3).map(memory => memory.title), memoryIds: memories.slice(0, 5).map(memory => memory.id) }
}

function createMockReport(memories: Memory[], request: GenerateTimeEchoRequest): TimeEchoReport {
  const zh = request.language === 'zh'; const now = new Date().toISOString()
  const emotionCounts = memories.reduce<Record<string, number>>((all, memory) => { all[memory.emotion] = (all[memory.emotion] || 0) + 1; return all }, {})
  const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || (zh ? '宁静' : 'calm')
  return {
    id: crypto.randomUUID(), title: zh ? '这一程的时光回响' : 'Echoes of this season',
    periodStart: request.fromDate, periodEnd: request.toDate, createdAt: now, updatedAt: now, language: request.language,
    memoryCount: memories.length, sourceMemoryIds: memories.map(memory => memory.id), favorite: false,
    stats: { activeDays: new Set(memories.map(memory => beijingDate(memory.occurredAt))).size, attachmentCount: memories.reduce((sum, memory) => sum + memory.attachments.length, 0), favoriteCount: memories.filter(memory => memory.favorite).length, emotionCounts },
    overview: zh ? `这段时光收拢了 ${memories.length} 缕记忆。${dominant}是其中最清晰的底色，日常细节彼此呼应，留下了一段可以慢慢回望的轨迹。` : `${memories.length} memories form this chapter. ${dominant} is its clearest emotional current, linking everyday details into a path worth revisiting.`,
    emotionalJourney: section(zh ? '情绪轨迹' : 'Emotional journey', zh ? `感受并非单一地向前，而是在${dominant}与其他细微情绪之间缓缓流动。` : `Feelings move gently between ${dominant} and quieter supporting emotions.`, memories),
    peopleAndRelationships: section(zh ? '人物与关系' : 'People & relationships', zh ? '被反复提及的人与陪伴，构成了这段时间的重要支点。' : 'Recurring people and companionship form important anchors in this period.', memories),
    placesAndScenes: section(zh ? '地点与场景' : 'Places & scenes', zh ? '熟悉的地点和具体场景，让记忆拥有了可以返回的坐标。' : 'Familiar places give these memories coordinates to return to.', memories),
    themesAndEvents: section(zh ? '主题与事件' : 'Themes & events', zh ? '日常、陪伴与成长交织成这段时间持续出现的主题。' : 'Everyday life, companionship and growth weave through this chapter.', memories),
    patternsAndInsights: section(zh ? '变化与洞察' : 'Patterns & insights', zh ? '那些看似微小的选择，正在形成更稳定、更清楚的生活节奏。' : 'Small choices are gradually forming a steadier and clearer rhythm.', memories),
    treasuredMoments: memories.slice(0, 3).map(memory => ({ title: memory.title, reflection: zh ? '这一刻保存了独特而真实的情绪纹理。' : 'This moment preserves a distinct and honest emotional texture.', memoryIds: [memory.id] })),
    closingReflection: zh ? '愿这些回响不替你定义过去，只在需要时，为你照亮曾经走过的水纹。' : 'May these echoes never define your past, but gently illuminate the ripples you have crossed.'
  }
}

export const timeEchoRepository = {
  async list() { return isDesktop() ? nativeBridge.listTimeEchoes() : readBrowserTimeEchoes().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) },
  async get(id: string) { return isDesktop() ? nativeBridge.getTimeEcho(id) : readBrowserTimeEchoes().find(report => report.id === id) },
  async generate(request: GenerateTimeEchoRequest, memories: Memory[], onProgress: (progress: TimeEchoProgress) => void) {
    if (isDesktop()) return nativeBridge.generateTimeEcho(request, onProgress)
    const selected = memories.filter(memory => memory.status === 'active' && beijingDate(memory.occurredAt) >= request.fromDate && beijingDate(memory.occurredAt) <= request.toDate)
    if (!selected.length) throw new Error(request.language === 'zh' ? '所选时间范围内没有正在珍藏的记忆' : 'No treasured memories were found in this period')
    for (const progress of [
      { stage: 'preparing', message: request.language === 'zh' ? '正在整理记忆' : 'Preparing memories' },
      { stage: 'batching', message: request.language === 'zh' ? '正在分批回望' : 'Revisiting memories in batches' },
      { stage: 'synthesizing', message: request.language === 'zh' ? '正在汇聚回响' : 'Gathering the echoes' },
      { stage: 'saving', message: request.language === 'zh' ? '正在封存档案' : 'Sealing the archive' },
    ] as const) { onProgress({ ...progress, current: 1, total: 1 }); await pause(260) }
    const report = createMockReport(selected, request)
    writeBrowserTimeEchoes([report, ...readBrowserTimeEchoes()]); return report
  },
  async update(id: string, patch: { title?: string; favorite?: boolean }) {
    if (isDesktop()) return nativeBridge.updateTimeEcho(id, patch)
    const reports = readBrowserTimeEchoes(); const index = reports.findIndex(report => report.id === id)
    if (index < 0) throw new Error('时光回响不存在')
    reports[index] = { ...reports[index], ...patch, updatedAt: new Date().toISOString() }; writeBrowserTimeEchoes(reports); return reports[index]
  },
  async remove(id: string) { if (isDesktop()) return nativeBridge.deleteTimeEcho(id); writeBrowserTimeEchoes(readBrowserTimeEchoes().filter(report => report.id !== id)) },
}
