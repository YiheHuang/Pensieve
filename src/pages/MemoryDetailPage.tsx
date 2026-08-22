import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Heart, MapPin, Pencil, Play, Sparkles, Trash2, UserRound, WandSparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { memoryRepository } from '../services/memoryRepository'
import { MemoryCard } from '../components/MemoryCard'
import { AttachmentGallery } from '../components/AttachmentGallery'
import { ImmersiveReplay } from '../components/ImmersiveReplay'
import { emotionLabel, useI18n } from '../i18n'

export function MemoryDetailPage() {
  const { t, locale, language, isEnglish } = useI18n()
  const { id = '' } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const [replay, setReplay] = useState(false); const [editing, setEditing] = useState(false); const [content, setContent] = useState('')
  const { data: memory, isLoading } = useQuery({ queryKey: ['memory', id], queryFn: () => memoryRepository.get(id) })
  const { data: all = [] } = useQuery({ queryKey: ['memories'], queryFn: () => memoryRepository.list() })
  const save = useMutation({ mutationFn: () => memoryRepository.update(id, { content }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['memory', id] }); setEditing(false) } })
  if (isLoading) return <div className="page loading-page"><Sparkles /> {t('正在进入这缕记忆…', 'Entering this memory…')}</div>
  if (!memory) return <div className="page no-results"><h2>{t('这缕记忆没有留下回声', 'This memory left no echo')}</h2><Link to="/timeline">{t('回到记忆长廊', 'Return to the gallery')}</Link></div>
  const related = all.filter(m => m.id !== memory.id && m.tags.some(t => memory.tags.some(mt => mt.label === t.label))).slice(0, 2)
  return <div className="page detail-page">
    {replay && <ImmersiveReplay memory={memory} onClose={() => setReplay(false)} />}
    <header className="detail-nav"><button onClick={() => navigate(-1)}><ArrowLeft /> {t('返回水面', 'Return to surface')}</button><div><button aria-label={memory.favorite ? t('移出最珍贵记忆', 'Remove from treasured') : t('加入最珍贵记忆', 'Add to treasured')} className={memory.favorite ? 'favorite-active' : ''} onClick={async () => { await memoryRepository.update(id, { favorite: !memory.favorite }); await Promise.all([queryClient.invalidateQueries({ queryKey: ['memory', id] }), queryClient.invalidateQueries({ queryKey: ['memories'] })]) }}><Heart fill={memory.favorite ? 'currentColor' : 'none'} /></button><button onClick={() => { setContent(memory.content); setEditing(true) }}><Pencil /></button><button onClick={async () => { await memoryRepository.remove(id); navigate('/timeline') }}><Trash2 /></button></div></header>
    <article className="memory-detail"><div className="detail-hero"><span className="emotion-large" style={{ '--emotion': memory.emotionColor } as React.CSSProperties}><i /></span><div className="eyebrow">A MEMORY FROM YOUR PENSIEVE</div><h1>{memory.title}</h1><div className="detail-meta"><span><CalendarDays /> {format(new Date(memory.occurredAt), isEnglish ? 'MMMM d, yyyy · EEEE · HH:mm' : 'yyyy年M月d日 EEEE · HH:mm', { locale })}</span><span className="emotion-pill"><i style={{ background: memory.emotionColor }} />{emotionLabel(memory.emotion, language)}</span></div><button className="replay-button" onClick={() => setReplay(true)}><Play fill="currentColor" /> {t('沉浸回放', 'Immersive replay')}</button></div>
      <AttachmentGallery attachments={memory.attachments} /><section className="memory-story"><div className="story-mark">✦</div>{editing ? <div className="edit-box"><textarea value={content} onChange={e => setContent(e.target.value)} /><div><button onClick={() => setEditing(false)}>{t('取消', 'Cancel')}</button><button className="primary-button" onClick={() => save.mutate()}>{t('保存原文', 'Save text')}</button></div></div> : <p>{memory.content}</p>}</section>
      <section className="ai-insight"><WandSparkles /><div><span className="eyebrow">{t('冥想盆的轻声整理', 'A whisper from the basin')}</span><p>{memory.summary}</p>{memory.aiStatus === 'pending' && <small>{t('星光正在辨认这段记忆…', 'Starlight is reading this memory…')}</small>}</div></section>
      <section className="memory-clues"><h2>{t('水面留下的线索', 'Clues left on the surface')}</h2><div>{memory.tags.map(tag => <span key={tag.id}>{tag.kind === 'person' ? <UserRound /> : tag.kind === 'place' ? <MapPin /> : <Sparkles />}<b>{tag.label}</b><small>{tag.source === 'ai' ? t('AI 识别', 'AI detected') : t('你的标记', 'Your tag')}</small></span>)}</div></section>
      {!!related.length && <section className="related"><div className="section-title"><div><span className="eyebrow">CONNECTED WHISPERS</span><h2>{t('与它遥相呼应', 'Connected echoes')}</h2></div></div><div className="cards-grid">{related.map(m => <MemoryCard key={m.id} memory={m} />)}</div></section>}
    </article>
  </div>
}

