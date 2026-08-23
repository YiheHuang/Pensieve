import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArchiveRestore, Grid2X2, Heart, List, Search, Sparkles, Trash2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { MemoryCard } from '../components/MemoryCard'
import { memoryRepository } from '../services/memoryRepository'
import { useI18n } from '../i18n'

export function TimelinePage() {
  const { t, locale, isEnglish } = useI18n()
  const [view, setView] = useState<'timeline' | 'grid'>('timeline'); const [status, setStatus] = useState<'active' | 'trashed'>('active'); const [query, setQuery] = useState(''); const [favoriteOnly, setFavoriteOnly] = useState(false); const [pendingPurge, setPendingPurge] = useState<{ id: string; title: string } | null>(null); const [purging, setPurging] = useState(false)
  const { data: memories = [], refetch } = useQuery({ queryKey: ['memories', status], queryFn: () => memoryRepository.list(status) })
  const shown = memories.filter(m => (!favoriteOnly || m.favorite) && [m.title, m.content, ...m.tags.map(t => t.label)].join(' ').includes(query))
  const groups = useMemo(() => Object.entries(shown.reduce<Record<string, typeof shown>>((result, memory) => {
    const month = format(new Date(memory.occurredAt), isEnglish ? 'MMMM yyyy' : 'yyyy年 M月', { locale })
    ;(result[month] ||= []).push(memory)
    return result
  }, {})), [shown, isEnglish, locale])
  const purge = async () => {
    if (!pendingPurge) return
    setPurging(true)
    try { await memoryRepository.purge(pendingPurge.id); setPendingPurge(null); await refetch() } finally { setPurging(false) }
  }
  const trashActions = (memory: typeof shown[number]) => <div className="trash-actions"><button onClick={async () => { await memoryRepository.restore(memory.id); await refetch() }}><ArchiveRestore /> {t('唤醒', 'Restore')}</button><button className="purge-button" onClick={() => setPendingPurge({ id: memory.id, title: memory.title })}><XCircle /> {t('彻底删除', 'Delete forever')}</button></div>
  return <div className="page timeline-page">
    {pendingPurge && <div className="purge-confirm-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target && !purging) setPendingPurge(null) }}><section className="purge-confirm" role="dialog" aria-modal="true" aria-labelledby="purge-title"><span><Trash2 /></span><div className="eyebrow">{t('最后的消散', 'FINAL FADING')}</div><h2 id="purge-title">{t('让这缕记忆永远消散？', 'Let this memory fade forever?')}</h2><strong>“{pendingPurge.title}”</strong><p>{t('正文与附件将永远消散。', 'Its words and fragments will fade forever.')}</p><footer><button disabled={purging} onClick={() => setPendingPurge(null)}>{t('留下', 'Keep')}</button><button className="confirm-purge" disabled={purging} onClick={() => void purge()}>{purging ? t('正在消散…', 'Fading…') : t('让它消散', 'Let it fade')}</button></footer></section></div>}
    <header className="page-header sanctuary-header"><div className="eyebrow"><Sparkles size={14} /> {t('记忆星河', 'MEMORY GALLERY')}</div><h1>{status === 'active' ? t('记忆长廊', 'Memory Gallery') : t('沉睡的记忆', 'Sleeping Memories')}</h1><div className="header-count"><strong>{memories.length}</strong><span>{t('缕微光', 'glimmers')}</span></div></header>
    <div className="timeline-tools"><div className="segmented"><button className={status === 'active' ? 'active' : ''} onClick={() => setStatus('active')}>{t('珍藏', 'Treasured')}</button><button className={status === 'trashed' ? 'active' : ''} onClick={() => setStatus('trashed')}><Trash2 size={14} /> {t('沉睡', 'Sleeping')}</button></div><label><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('唤起一缕回声…', 'Call an echo…')} /></label><button aria-label={t('最珍贵记忆', 'Most treasured')} title={t('最珍贵记忆', 'Most treasured')} className={`favorite-filter ${favoriteOnly ? 'active' : ''}`} onClick={() => setFavoriteOnly(value => !value)}><Heart size={14} fill={favoriteOnly ? 'currentColor' : 'none'} /></button><div className="icon-toggle"><button aria-label={t('时间线', 'Timeline')} className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}><List /></button><button aria-label={t('网格', 'Grid')} className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 /></button></div></div>
    {!shown.length ? <div className="no-results"><ArchiveRestore /><h3>{favoriteOnly ? t('珍贵微光尚未点亮', 'No treasured glimmer yet') : t('水面静默', 'The water is still')}</h3></div> : view === 'grid' ? <div className="cards-grid timeline-grid">{shown.map(m => <div className="trash-card-wrap" key={m.id}><MemoryCard memory={m} />{status === 'trashed' && trashActions(m)}</div>)}</div> : <div className="timeline">{groups.map(([month, items]) => <section className="timeline-group" key={month}><div className="timeline-month"><span>{month}</span><i /></div><div className="timeline-items">{items?.map(m => <div className="timeline-row" key={m.id}><time><strong>{format(new Date(m.occurredAt), 'dd')}</strong><span>{format(new Date(m.occurredAt), 'EEEE', { locale })}</span></time><MemoryCard memory={m} featured />{status === 'trashed' && trashActions(m)}</div>)}</div></section>)}</div>}
  </div>
}
