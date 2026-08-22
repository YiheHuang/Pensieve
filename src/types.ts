export type MemoryStatus = 'active' | 'archived' | 'trashed'
export type MediaKind = 'image' | 'audio' | 'video'

export interface Attachment {
  id: string
  name: string
  kind: MediaKind
  mimeType: string
  size: number
  url?: string
  encryptedPath?: string
  duration?: number
  transcript?: string
  status: 'pending' | 'ready' | 'failed'
}

export interface EntityTag {
  id: string
  label: string
  kind: 'person' | 'place' | 'topic' | 'custom'
  confidence: number
  source: 'ai' | 'user'
}

export interface Memory {
  id: string
  title: string
  content: string
  summary: string
  occurredAt: string
  createdAt: string
  updatedAt: string
  emotion: string
  emotionColor: string
  status: MemoryStatus
  tags: EntityTag[]
  attachments: Attachment[]
  aiStatus: 'idle' | 'pending' | 'succeeded' | 'failed'
  favorite?: boolean
}

export interface MemoryDraft {
  title?: string
  content: string
  occurredAt: string
  emotion?: string
  tags?: string[]
  attachments?: Attachment[]
}

export interface SearchFilters {
  query: string
  emotion?: string
  tag?: string
  mediaKind?: MediaKind
  from?: string
  to?: string
}

export interface AiSettings {
  enabled: boolean
  baseUrl: string
  chatModel: string
  embeddingModel: string
  transcriptionModel: string
  hasApiKey: boolean
}
