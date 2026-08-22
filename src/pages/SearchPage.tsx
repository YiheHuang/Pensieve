import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Filter, Image, Music2, Search, Sparkles, Video, X } from 'lucide-react'
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
      <header className="page-header centered"><div className="eyebrow"><Sparkles size={14} /> ENTER A MEMORY</div><h1>{t('今天，想沉浸于哪一段时光？', 'Which moment would you like to enter?')}</h1><p>{t('试着描述一个人、一种感受，或那个模糊却忘不掉的场景。', 'Describe a person, a feeling, or a scene that still lingers.')}</p></header>
      <form className="magic-search" onSubmit={submit}><Sparkles className="search-spark" /><input value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} placeholder={t('比如：和朋友在雨天散步的那个下午…', 'For example: that rainy afternoon walk with a friend…')} /><button type="submit"><Search /> {t('向冥想盆询问', 'Ask the basin')}</button></form>
      <section className="filter-bar"><span><Filter size={15} /> {t('沉浸线索', 'Clues')}</span><select value={filters.emotion || ''} onChange={e => setFilters({ ...filters, emotion: e.target.value || undefined })}><option value="">{t('所有情绪', 'All emotions')}</option>{['欣喜','宁静','温暖','怀念','勇敢','难过'].map(x => <option key={x} value={x}>{emotionLabel(x, language)}</option>)}</select><input type="date" aria-label={t('开始日期', 'Start date')} value={filters.from || ''} onChange={e => setFilters({ ...filters, from: e.target.value || undefined })} /><span>{t('至', 'to')}</span><input type="date" aria-label={t('结束日期', 'End date')} value={filters.to || ''} onChange={e => setFilters({ ...filters, to: e.target.value || undefined })} />
      <div className="media-filters">{([{ k: 'image', I: Image }, { k: 'audio', I: Music2 }, { k: 'video', I: Video }] as const).map(({ k, I }) => <button type="button" className={filters.mediaKind === k ? 'active' : ''} onClick={() => setFilters({ ...filters, mediaKind: filters.mediaKind === k ? undefined : k })} key={k}><I size={15} /></button>)}</div>
      {(filters.emotion || filters.from || filters.to || filters.mediaKind) && <button type="button" className="clear-filter" onClick={() => setFilters({ query: filters.query })}><X size={14} /> {t('清除', 'Clear')}</button>}
    </section>
      {!searched ? <section className="search-empty"><div className="ripple-icon"><Search /></div><h2>{t('记忆的水面很平静', 'The surface is still')}</h2><p>{t('输入一句自然的话，冥想盆会理解其中的人物、时刻与情绪。', 'Write naturally; the basin understands people, moments and feelings.')}</p><div className="suggestions">{[t('那些让我觉得勇敢的时刻', 'Moments when I felt brave'), t('和家人在一起的温暖晚上', 'Warm evenings with family'), t('去年秋天发生的小惊喜', 'Small surprises from last autumn')].map(q => <button onClick={() => { setFilters({ query: q }); search.mutate({ query: q }); setSearched(true) }} key={q}>“{q}”</button>)}</div></section>
      : <section className="search-results"><div className="section-title"><div><span className="eyebrow">MEMORIES SURFACED</span><h2>{search.isPending ? t('正在聆听水中的回声…', 'Listening for echoes…') : t(`${search.data?.length || 0} 缕记忆浮出水面`, `${search.data?.length || 0} memories surfaced`)}</h2></div></div><div className="cards-grid">{search.data?.map(r => <MemoryCard key={r.memory.id} memory={r.memory} reason={r.reason} />)}</div>{!search.isPending && !search.data?.length && <div className="no-results"><Sparkles /><h3>{t('这次没有泛起回声', 'No echo surfaced this time')}</h3><p>{t('换一种说法，或放宽日期与情绪条件试试。', 'Try another phrase or broaden the date and emotion filters.')}</p></div>}</section>}
  </div>
}
