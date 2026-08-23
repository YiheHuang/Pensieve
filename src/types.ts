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
  emotions?: string[]
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
  emotions?: string[]
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

export interface TimeEchoSection {
  heading: string
  narrative: string
  highlights: string[]
  memoryIds: string[]
}

export interface TimeEchoReference {
  title: string
  reflection: string
  memoryIds: string[]
}

export interface TimeEchoStats {
  activeDays: number
  attachmentCount: number
  favoriteCount: number
  emotionCounts: Record<string, number>
}

export interface TimeEchoReport {
  id: string
  title: string
  periodStart: string
  periodEnd: string
  createdAt: string
  updatedAt: string
  language: 'zh' | 'en'
  memoryCount: number
  sourceMemoryIds: string[]
  favorite: boolean
  stats: TimeEchoStats
  overview: string
  emotionalJourney: TimeEchoSection
  peopleAndRelationships: TimeEchoSection
  placesAndScenes: TimeEchoSection
  themesAndEvents: TimeEchoSection
  patternsAndInsights: TimeEchoSection
  treasuredMoments: TimeEchoReference[]
  closingReflection: string
}

export interface GenerateTimeEchoRequest {
  fromDate: string
  toDate: string
  language: 'zh' | 'en'
}

export interface TimeEchoProgress {
  stage: 'preparing' | 'batching' | 'synthesizing' | 'saving'
  current: number
  total: number
  message: string
}
