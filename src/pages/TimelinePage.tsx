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
    {pendingPurge && <div className="purge-confirm-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target && !purging) setPendingPurge(null) }}><section className="purge-confirm" role="dialog" aria-modal="true" aria-labelledby="purge-title"><span><Trash2 /></span><div className="eyebrow">IRREVERSIBLE</div><h2 id="purge-title">{t('确认彻底删除这段记忆？', 'Delete this memory forever?')}</h2><strong>“{pendingPurge.title}”</strong><p>{t('确认后，正文、标签以及保存在冥想盆中的全部附件副本都会永久消散，此操作不可撤销。', 'Its text, tags, and every attachment copy stored in Pensieve will be permanently erased. This action cannot be undone.')}</p><footer><button disabled={purging} onClick={() => setPendingPurge(null)}>{t('再想一想', 'Keep it')}</button><button className="confirm-purge" disabled={purging} onClick={() => void purge()}>{purging ? t('正在消散…', 'Erasing…') : t('确认彻底删除', 'Delete forever')}</button></footer></section></div>}
    <header className="page-header split"><div><div className="eyebrow"><Sparkles size={14} /> MEMORY GALLERY</div><h1>{status === 'active' ? t('记忆长廊', 'Memory Gallery') : t('沉睡的记忆', 'Sleeping Memories')}</h1><p>{status === 'active' ? t('沿着时间的水纹，看看那些被珍藏的片刻。', 'Follow the ripples of time through your treasured moments.') : t('这里的记忆会保留，直到你决定唤醒它们。', 'These memories remain here until you awaken them.')}</p></div><div className="stats"><strong>{memories.length}</strong><span>{t('缕记忆', 'memories')}</span><i /><strong>{new Set(memories.flatMap(m => m.tags.map(t => t.label))).size}</strong><span>{t('个线索', 'clues')}</span></div></header>
    <div className="timeline-tools"><label><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('在长廊中寻找…', 'Search the gallery…')} /></label><button className={`favorite-filter ${favoriteOnly ? 'active' : ''}`} onClick={() => setFavoriteOnly(value => !value)}><Heart size={14} fill={favoriteOnly ? 'currentColor' : 'none'} /> {t('最珍贵记忆', 'Most treasured')}</button><div className="segmented"><button className={status === 'active' ? 'active' : ''} onClick={() => setStatus('active')}>{t('正在珍藏', 'Treasured')}</button><button className={status === 'trashed' ? 'active' : ''} onClick={() => setStatus('trashed')}><Trash2 size={14} /> {t('回收站', 'Archive')}</button></div><div className="icon-toggle"><button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}><List /></button><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 /></button></div></div>
    {!shown.length ? <div className="no-results"><ArchiveRestore /><h3>{favoriteOnly ? t('还没有被点亮的珍贵记忆', 'No treasured memories yet') : t('这里暂时空空的', 'It is quiet here')}</h3><p>{favoriteOnly ? t('在记忆详情点击爱心，它就会来到这里。', 'Tap the heart in a memory to bring it here.') : status === 'trashed' ? t('被放回长廊的记忆会重新泛起微光。', 'Restored memories will glow in the gallery again.') : t('第一缕记忆正等着你存入。', 'Your first memory is waiting.')}</p></div> : view === 'grid' ? <div className="cards-grid timeline-grid">{shown.map(m => <div className="trash-card-wrap" key={m.id}><MemoryCard memory={m} />{status === 'trashed' && trashActions(m)}</div>)}</div> : <div className="timeline">{groups.map(([month, items]) => <section className="timeline-group" key={month}><div className="timeline-month"><span>{month}</span><i /></div><div className="timeline-items">{items?.map(m => <div className="timeline-row" key={m.id}><time><strong>{format(new Date(m.occurredAt), 'dd')}</strong><span>{format(new Date(m.occurredAt), 'EEEE', { locale })}</span></time><MemoryCard memory={m} featured />{status === 'trashed' && trashActions(m)}</div>)}</div></section>)}</div>}
  </div>
}
