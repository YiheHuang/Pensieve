import { describe, expect, it } from 'vitest'
import { memoryRepository } from './memoryRepository'

describe('memoryRepository', () => {
  it('先保存原文，再以等待状态进入 AI 队列', async () => {
    const memory = await memoryRepository.create({ content: '和妈妈在雨后的湖边散步，心里很温暖。', occurredAt: '2026-08-21T18:00' })
    expect(memory.content).toContain('妈妈')
    expect(memory.aiStatus).toBe('pending')
    expect(memory.tags.map(tag => tag.label)).toContain('陪伴')
  })

  it('按自然语言与情绪筛选记忆', async () => {
    await memoryRepository.create({ content: '项目完成后，和朋友开心地庆祝。', occurredAt: '2026-08-20T18:00', emotion: '欣喜' })
    const results = await memoryRepository.search({ query: '朋友 庆祝', emotion: '欣喜' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].memory.emotion).toBe('欣喜')
  })

  it('分析后保留一个主情绪和多个可检索的副情绪', async () => {
    const created = await memoryRepository.create({ content: '想起从前和妈妈一起坚持完成这件事，既温暖、怀念，也为自己的勇敢感到开心。', occurredAt: '2026-08-20T18:00' })
    const analyzed = await memoryRepository.analyze(created.id)
    const emotions = analyzed.emotions ?? [analyzed.emotion]
    expect(emotions.length).toBeGreaterThan(1)
    expect(analyzed.emotion).toBe(emotions[0])
    expect(new Set(emotions).size).toBe(emotions.length)
    expect((await memoryRepository.search({ query: '', emotion: emotions[1] })).some(result => result.memory.id === analyzed.id)).toBe(true)
  })

  it('中文连续查询可通过局部语义片段召回', async () => {
    await memoryRepository.create({ content: '今天要和xxx见面啦', occurredAt: '2026-08-22T18:00' })
    const results = await memoryRepository.search({ query: '朋友见面' })
    expect(results.some(result => result.memory.content.includes('xxx见面'))).toBe(true)
  })

  it('删除进入回收站且可恢复', async () => {
    const memory = await memoryRepository.create({ content: '需要暂时收起的一段记忆。', occurredAt: '2026-08-19T18:00' })
    await memoryRepository.remove(memory.id)
    expect((await memoryRepository.list('trashed')).some(item => item.id === memory.id)).toBe(true)
    await memoryRepository.restore(memory.id)
    expect((await memoryRepository.list()).some(item => item.id === memory.id)).toBe(true)
  })

  it('回收站记忆可被彻底删除', async () => {
    const memory = await memoryRepository.create({ content: '准备彻底删除的一段记忆。', occurredAt: '2026-08-19T18:00' })
    await memoryRepository.remove(memory.id)
    await memoryRepository.purge(memory.id)
    expect(await memoryRepository.get(memory.id)).toBeUndefined()
  })

  it('允许修改记忆发生时间', async () => {
    const memory = await memoryRepository.create({ content: '一段需要校准时间的记忆。', occurredAt: '2026-08-19T18:00' })
    await memoryRepository.update(memory.id, { occurredAt: '2026-08-18T03:30:00.000Z' })
    expect((await memoryRepository.get(memory.id))?.occurredAt).toBe('2026-08-18T03:30:00.000Z')
  })

  it('备份导出后可以完整恢复', async () => {
    await memoryRepository.create({ content: '需要带走的记忆。', occurredAt: '2026-08-18T18:00' })
    const backup = memoryRepository.exportAll()
    localStorage.clear()
    memoryRepository.importAll(backup)
    expect((await memoryRepository.list()).some(item => item.content === '需要带走的记忆。')).toBe(true)
  })
})
