import { invoke } from '@tauri-apps/api/core'
import type { AiSettings, Attachment, Memory, SearchFilters } from '../types'

export const isDesktop = () => '__TAURI_INTERNALS__' in window

export const nativeBridge = {
  status: () => invoke<{ initialized: boolean; unlocked: boolean }>('vault_status'),
  initialize: (pin: string) => invoke<void>('initialize_vault', { pin }),
  unlock: (pin: string) => invoke<void>('unlock_vault', { pin }),
  lock: () => invoke<void>('lock_vault'),
  list: (status: Memory['status']) => invoke<Memory[]>('list_memories', { status }),
  get: (id: string) => invoke<Memory | undefined>('get_memory', { id }),
  save: (memory: Memory) => invoke<Memory>('save_memory', { memory }),
  search: (request: SearchFilters) => invoke<Array<{ memory: Memory; score: number; reason: string }>>('search_memories', { request }),
  importAttachment: (path: string, memoryId: string) => invoke<Attachment>('import_attachment', { path, memoryId }),
  importAttachmentBytes: (name: string, mimeType: string, dataBase64: string, memoryId: string) => invoke<Attachment>('import_attachment_bytes', { name, mimeType, dataBase64, memoryId }),
  getAttachmentData: (encryptedPath: string) => invoke<string>('get_attachment_data', { encryptedPath }),
  exportBackup: (path: string, password: string) => invoke<void>('export_backup', { path, password }),
  restoreBackup: (path: string, password: string) => invoke<void>('restore_backup', { path, password }),
  configureAi: (config: AiSettings, apiKey?: string) => invoke<void>('configure_ai', { config: { enabled: config.enabled, baseUrl: config.baseUrl, chatModel: config.chatModel, embeddingModel: config.embeddingModel, transcriptionModel: config.transcriptionModel }, apiKey }),
  analyzeMemory: (id: string) => invoke<Memory>('analyze_memory', { id }),
}
