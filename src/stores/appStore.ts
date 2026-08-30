import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AiSettings } from '../types'
import type { Language } from '../i18n'
import { isDesktop, nativeBridge } from '../services/nativeBridge'

interface AppState {
  locked: boolean
  hasPin: boolean
  pinHash: string
  reduceMotion: boolean
  soundEnabled: boolean
  language: Language
  displayName: string
  ai: AiSettings
  setupPin: (pin: string, displayName?: string) => void
  unlock: (pin: string) => boolean
  lock: () => void
  setPreference: (patch: Partial<Pick<AppState, 'reduceMotion' | 'soundEnabled'>>) => void
  setLanguage: (language: Language) => void
  setDisplayName: (displayName: string) => void
  setAi: (patch: Partial<AiSettings>) => void
}

const hashPin = (pin: string) => btoa([...pin].reverse().join('') + ':pensieve')

export const useAppStore = create<AppState>()(persist((set, get) => ({
  locked: true, hasPin: false, pinHash: '', reduceMotion: false, soundEnabled: true, language: 'zh', displayName: '',
  ai: { enabled: false, baseUrl: 'https://api.openai.com/v1', chatModel: 'gpt-4.1-mini', embeddingModel: 'text-embedding-3-small', transcriptionModel: 'whisper-1', hasApiKey: false },
  setupPin: (pin, displayName = '') => set({ hasPin: true, locked: false, pinHash: isDesktop() ? '' : hashPin(pin), displayName: displayName.trim() }),
  // The native encrypted vault is the source of truth on desktop. LockScreen
  // calls nativeBridge.unlock first, so reaching this method means the PIN has
  // already unlocked the restored database. A WebView-local hash would belong
  // to the destination computer and must not reject the source vault PIN.
  unlock: pin => {
    if (isDesktop()) { set({ hasPin: true, locked: false, pinHash: '' }); return true }
    const ok = get().pinHash === hashPin(pin)
    if (ok) set({ locked: false })
    return ok
  },
  lock: () => { if (isDesktop()) void nativeBridge.lock(); set({ locked: true }) },
  setPreference: patch => set(patch),
  setLanguage: language => set({ language }),
  setDisplayName: displayName => set({ displayName }),
  setAi: patch => set(s => ({ ai: { ...s.ai, ...patch } })),
}), { name: 'pensieve.app.v1', partialize: s => ({ hasPin: s.hasPin, pinHash: s.pinHash, reduceMotion: s.reduceMotion, soundEnabled: s.soundEnabled, language: s.language, displayName: s.displayName, ai: s.ai }) }))
