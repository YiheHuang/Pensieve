import { seedMemories } from '../data/seed'
import type { Memory, MemoryDraft, SearchFilters } from '../types'
import { isDesktop, nativeBridge } from './nativeBridge'
import { beijingInputToIso } from '../utils/date'

const STORAGE_KEY = 'pensieve.memories.v1'
const wait = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms))

function read(): Memory[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedMemories))
    return seedMemories
  }
  try { return JSON.parse(stored) as Memory[] } catch { return seedMemories }
}

function write(memories: Memory[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(memories)) }

const colors: Record<string, string> = { 欣喜: '#f4ca72', 宁静: '#86c8d7', 温暖: '#ec9e7e', 怀念: '#b7a1e5', 勇敢: '#8cd4bd', 难过: '#8193c9' }

export const memoryRepository = {
  async list(status: Memory['status'] = 'active') { if (isDesktop()) return nativeBridge.list(status); await wait(); return read().filter(m => m.status === status).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) },
  async get(id: string) { if (isDesktop()) return nativeBridge.get(id); await wait(60); return read().find(m => m.id === id) },
  async create(draft: MemoryDraft) {
    const now = new Date().toISOString()
    const emotion = draft.emotion || inferEmotion(draft.content)
    const tagLabels = draft.tags?.length ? draft.tags : inferTags(draft.content)
    const memory: Memory = {
      id: crypto.randomUUID(), title: draft.title?.trim() || inferTitle(draft.content), content: draft.content.trim(),
      summary: draft.content.trim().slice(0, 72) + (draft.content.length > 72 ? '…' : ''),
      occurredAt: beijingInputToIso(draft.occurredAt), createdAt: now, updatedAt: now,
      emotion, emotionColor: colors[emotion] || '#a99be2', status: 'active', aiStatus: 'pending', favorite: false,
      attachments: draft.attachments || [],
      tags: tagLabels.map((label, index) => ({ id: crypto.randomUUID(), label, kind: index === 0 ? 'topic' : 'custom', confidence: .82, source: 'ai' })),
    }
    if (isDesktop()) { await nativeBridge.save(memory) } else write([memory, ...read()])
    window.setTimeout(() => {
      if (isDesktop()) { void nativeBridge.analyzeMemory(memory.id).then(() => window.dispatchEvent(new Event('pensieve:data'))).catch(() => undefined) }
      else { const all = read(); const item = all.find(m => m.id === memory.id); if (item) { item.aiStatus = 'succeeded'; write(all); window.dispatchEvent(new Event('pensieve:data')) } }
    }, 1800)
    return memory
  },
  async update(id: string, patch: Partial<Memory>) { if (isDesktop()) { const current = await nativeBridge.get(id); if (!current) return; return nativeBridge.save({ ...current, ...patch, updatedAt: new Date().toISOString() }) } const all = read(); const i = all.findIndex(m => m.id === id); if (i < 0) return; all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() }; write(all); return all[i] },
  async remove(id: string) { return this.update(id, { status: 'trashed' }) },
  async restore(id: string) { return this.update(id, { status: 'active' }) },
  async search(filters: SearchFilters) {
    if (isDesktop()) return nativeBridge.search(filters)
    await wait(180)
    const q = filters.query.trim().toLowerCase()
    return read().filter(m => m.status === 'active').filter(m => {
      const corpus = [m.title, m.content, m.summary, m.emotion, ...m.tags.map(t => t.label)].join(' ').toLowerCase()
      return lexicalScore(q, corpus) > 0 &&
        (!filters.emotion || m.emotion === filters.emotion) && (!filters.tag || m.tags.some(t => t.label === filters.tag)) &&
        (!filters.mediaKind || m.attachments.some(a => a.kind === filters.mediaKind)) &&
        (!filters.from || m.occurredAt >= filters.from) && (!filters.to || m.occurredAt <= filters.to + 'T23:59:59')
    }).map((memory, index) => ({ memory, score: Math.max(.62, .96 - index * .08), reason: q ? `与你询问的「${filters.query}」在情境与主题上相近` : '符合当前筛选条件' }))
  },
  async random() { const items = await this.list('active'); return items[Math.floor(Math.random() * items.length)] },
  exportAll() { return JSON.stringify({ format: 'pensieve-backup', version: 1, exportedAt: new Date().toISOString(), memories: read() }, null, 2) },
  importAll(raw: string) { const data = JSON.parse(raw); if (data.format !== 'pensieve-backup' || !Array.isArray(data.memories)) throw new Error('备份文件格式不正确'); write(data.memories) },
}

function inferTitle(text: string) { const first = text.split(/[。！？\n]/)[0].trim(); return first.slice(0, 18) || '一缕未命名的记忆' }
function inferEmotion(text: string) { if (/开心|完成|庆祝|成功/.test(text)) return '欣喜'; if (/妈妈|家|陪伴|温柔/.test(text)) return '温暖'; if (/难过|遗憾|哭/.test(text)) return '难过'; return '宁静' }
function inferTags(text: string) { const tags = ['日常']; if (/朋友|同事|妈妈|爸爸|家人/.test(text)) tags.push('陪伴'); if (/雨|风|湖|山|海/.test(text)) tags.push('自然'); if (/工作|项目|完成/.test(text)) tags.push('成长'); return tags.slice(0, 3) }

function lexicalScore(query: string, corpus: string) {
  if (!query) return 0.65
  if (corpus.includes(query)) return 0.95
  if (query.split(/\s+/).some(token => token && corpus.includes(token))) return 0.78
  const chars = [...query.replace(/\s+/g, '')]
  if (chars.length < 2) return 0
  const fragments = chars.slice(0, -1).map((char, index) => char + chars[index + 1])
  const matched = fragments.filter(fragment => corpus.includes(fragment)).length
  return matched ? Math.min(0.84, 0.56 + 0.28 * matched / fragments.length) : 0
}
