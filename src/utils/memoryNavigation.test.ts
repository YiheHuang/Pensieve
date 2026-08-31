import { describe, expect, it } from 'vitest'
import type { Memory } from '../types'
import { getMemoryNeighbors } from './memoryNavigation'

const memory = (id: string, occurredAt: string, status: Memory['status'] = 'active') => ({
  id, occurredAt, status, title: id, content: '', summary: '', createdAt: occurredAt,
  updatedAt: occurredAt, emotion: '宁静', emotionColor: '#fff', tags: [], attachments: [],
  aiStatus: 'idle' as const,
}) satisfies Memory

describe('memory sequence navigation', () => {
  const memories = [
    memory('older', '2026-08-01T10:00:00Z'),
    memory('trashed', '2026-08-30T10:00:00Z', 'trashed'),
    memory('newer', '2026-08-20T10:00:00Z'),
    memory('middle', '2026-08-10T10:00:00Z'),
  ]

  it('follows the newest-first gallery order and skips inactive memories', () => {
    const result = getMemoryNeighbors(memories, 'middle')
    expect(result.previous?.id).toBe('newer')
    expect(result.next?.id).toBe('older')
    expect([result.position, result.total]).toEqual([2, 3])
  })

  it('stops at the first and last memory instead of looping', () => {
    expect(getMemoryNeighbors(memories, 'newer').previous).toBeUndefined()
    expect(getMemoryNeighbors(memories, 'older').next).toBeUndefined()
  })
})
