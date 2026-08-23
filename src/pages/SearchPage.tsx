import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, Filter, Image, Music2, Search, Sparkles, Video, X } from 'lucide-react'
import { MemoryCard } from '../components/MemoryCard'
import { memoryRepository } from '../services/memoryRepository'
import type { SearchFilters } from '../types'
import { playMemoryChime } from '../services/sound'
import { emotionLabel, useI18n } from '../i18n'

export function SearchPage() {
  const { t, language } = useI18n()
  const [filters, setFilters] = useState<SearchFilters>({ query: '' }); const [searched, setSearched] = useState(false)
  const search = useMutation({ mutationFn: memoryRepository.search, onMutate: () => setSearched(true), onSuccess:()=>playMemoryChime('retrieve') })
  const submit = (e: React.FormEvent) => { e.preventDefault(); search.mutate(filters) }
  return <div className="page search-page">
      <header className="page-header sanctuary-header"><div className="eyebrow"><Sparkles size={14} /> {t('沉入回声', 'ENTER AN ECHO')}</div><h1>{t('沉入哪一段时光？', 'Which moment calls?')}</h1></header>
      <form className="magic-search" onSubmit={submit}><Sparkles className="search-spark" /><input aria-label={t('唤起一段记忆', 'Call a memory')} value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} placeholder={t('唤起一段记忆…', 'Call a memory…')} /><button type="submit"><Search /> {t('沉入水面', 'Enter the water')}</button></form>
      <details className="filter-drawer"><summary><Filter size={15} /> {t('水面线索', 'Surface clues')} <ChevronDown /></summary><section className="filter-bar"><select value={filters.emotion || ''} onChange={e => setFilters({ ...filters, emotion: e.target.value || undefined })}><option value="">{t('所有情绪', 'All emotions')}</option>{['欣喜','宁静','温暖','怀念','勇敢','难过'].map(x => <option key={x} value={x}>{emotionLabel(x, language)}</option>)}</select><input type="date" aria-label={t('开始日期', 'Start date')} value={filters.from || ''} onChange={e => setFilters({ ...filters, from: e.target.value || undefined })} /><span>{t('至', 'to')}</span><input type="date" aria-label={t('结束日期', 'End date')} value={filters.to || ''} onChange={e => setFilters({ ...filters, to: e.target.value || undefined })} />
      <div className="media-filters">{([{ k: 'image', I: Image }, { k: 'audio', I: Music2 }, { k: 'video', I: Video }] as const).map(({ k, I }) => <button type="button" className={filters.mediaKind === k ? 'active' : ''} onClick={() => setFilters({ ...filters, mediaKind: filters.mediaKind === k ? undefined : k })} key={k}><I size={15} /></button>)}</div>
      {(filters.emotion || filters.from || filters.to || filters.mediaKind) && <button type="button" className="clear-filter" onClick={() => setFilters({ query: filters.query })}><X size={14} /> {t('清除', 'Clear')}</button>}
    </section></details>
      {!searched ? <section className="search-empty"><div className="ripple-icon"><Search /></div><h2>{t('水面静候', 'The water awaits')}</h2></section>
      : <section className="search-results"><div className="section-title"><div><span className="eyebrow">{t('浮现的回声', 'SURFACED ECHOES')}</span><h2>{search.isPending ? t('聆听水下回声…', 'Listening below…') : t(`${search.data?.length || 0} 缕记忆浮现`, `${search.data?.length || 0} memories surfaced`)}</h2></div></div><div className="cards-grid">{search.data?.map(r => <MemoryCard key={r.memory.id} memory={r.memory} reason={r.reason} />)}</div>{!search.isPending && !search.data?.length && <div className="no-results"><Sparkles /><h3>{t('水面未起回声', 'No echo surfaced')}</h3></div>}</section>}
  </div>
}
