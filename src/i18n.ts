import { enUS, zhCN } from 'date-fns/locale'
import { useAppStore } from './stores/appStore'

export type Language = 'zh' | 'en'

export function useI18n() {
  const language = useAppStore(state => state.language)
  return {
    language,
    isEnglish: language === 'en',
    locale: language === 'en' ? enUS : zhCN,
    t: (zh: string, en: string) => language === 'en' ? en : zh,
  }
}

export function emotionLabel(emotion: string, language: Language) {
  if (language === 'zh') return emotion
  return ({ 欣喜: 'Joy', 宁静: 'Serenity', 温暖: 'Warmth', 怀念: 'Nostalgia', 勇敢: 'Courage', 难过: 'Sadness' } as Record<string, string>)[emotion] || emotion
}

export function memoryEmotionValues(memory: { emotion: string; emotions?: string[] }) {
  return memory.emotions?.length ? memory.emotions : [memory.emotion]
}
