import type { Memory } from '../types'

export interface MemoryNeighbors {
  previous?: Memory
  next?: Memory
  position: number
  total: number
}

/** Follow the same newest-first order used by the Memory Gallery. */
export function getMemoryNeighbors(memories: Memory[], currentId: string): MemoryNeighbors {
  const ordered = memories
    .filter(memory => memory.status === 'active')
    .toSorted((left, right) => right.occurredAt.localeCompare(left.occurredAt))
  const index = ordered.findIndex(memory => memory.id === currentId)

  if (index < 0) return { position: 0, total: ordered.length }
  return {
    previous: index > 0 ? ordered[index - 1] : undefined,
    next: index + 1 < ordered.length ? ordered[index + 1] : undefined,
    position: index + 1,
    total: ordered.length,
  }
}
