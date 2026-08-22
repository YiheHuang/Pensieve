import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Heart, MapPin, Pencil, Play, RefreshCw, Sparkles, Trash2, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { memoryRepository } from '../services/memoryRepository'
import { MemoryCard } from '../components/MemoryCard'
import { AttachmentGallery } from '../components/AttachmentGallery'
import { ImmersiveReplay } from '../components/ImmersiveReplay'
import { emotionLabel, memoryEmotionValues, useI18n } from '../i18n'
import { isDesktop, nativeBridge } from '../services/nativeBridge'
import { open } from '@tauri-apps/plugin-dialog'
import type { Attachment } from '../types'
import { beijingDateTimeLocal, beijingInputToIso } from '../utils/date'

export function MemoryDetailPage() {
  const { t, locale, language, isEnglish } = useI18n()
  const { id = '' } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const fileRef = useRef<HTMLInputElement>(null); const [replay, setReplay] = useState(false); const [editing, setEditing] = useState(false); const [content, setContent] = useState(''); const [occurredAt, setOccurredAt] = useState('')
  const { data: memory, isLoading } = useQuery({ queryKey: ['memory', id], queryFn: () => memoryRepository.get(id) })
  const { data: all = [] } = useQuery({ queryKey: ['memories'], queryFn: () => memoryRepository.list() })
  const refresh = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['memory', id] }), queryClient.invalidateQueries({ queryKey: ['memories'] })]) }
  const save = useMutation({ mutationFn: () => memoryRepository.update(id, { content: content.trim(), summary: content.trim(), occurredAt: beijingInputToIso(occurredAt), aiStatus: 'idle' }), onSuccess: async () => { await refresh(); setEditing(false) } })
  const reanalyze = useMutation({ mutationFn: () => memoryRepository.analyze(id), onSuccess: refresh })
  if (isLoading) return <div className="page loading-page"><Sparkles /> {t('正在进入这缕记忆…', 'Entering this memory…')}</div>
  if (!memory) return <div className="page no-results"><h2>{t('这缕记忆没有留下回声', 'This memory left no echo')}</h2><Link to="/timeline">{t('回到记忆长廊', 'Return to the gallery')}</Link></div>
  const addAttachments = async (files?: FileList | null) => {
    let added: Attachment[] = []
    if (isDesktop()) {
      const selected = await open({ multiple: true, filters: [{ name: t('记忆附件', 'Memory attachments'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp3', 'wav', 'm4a', 'mp4', 'mov', 'webm'] }] }); if (!selected) return
      const paths = Array.isArray(selected) ? selected : [selected]; added = await Promise.all(paths.map(path => nativeBridge.importAttachment(path, id)))
    } else if (files) {
      added = Array.from(files).map(file => ({ id: crypto.randomUUID(), name: file.name, mimeType: file.type, size: file.size, kind: file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : 'video', url: URL.createObjectURL(file), status: 'ready' }))
    }
    if (added.length) { await memoryRepository.update(id, { attachments: [...memory.attachments, ...added] }); await refresh() }
  }
  const removeAttachment = async (attachment: Attachment) => { if (!memory.content.trim() && memory.attachments.length === 1) { window.alert(t('请至少保留文字或一个附件。', 'Keep either some text or one attachment.')); return } if (!window.confirm(t(`删除附件“${attachment.name}”？`, `Delete “${attachment.name}”?`))) return; await memoryRepository.deleteAttachment(id, attachment.id); await refresh() }
  const renameAttachment = async (attachment: Attachment, name: string) => { if (name.trim() && name.trim() !== attachment.name) { await memoryRepository.renameAttachment(id, attachment.id, name); await refresh() } }
  const related = all.filter(m => m.id !== memory.id && m.tags.some(t => memory.tags.some(mt => mt.label === t.label))).slice(0, 2)
  const memoryEmotions = memoryEmotionValues(memory)
  return <div className="page detail-page">
    {replay && <ImmersiveReplay memory={memory} onClose={() => setReplay(false)} />}
    <header className="detail-nav"><button onClick={() => navigate(-1)}><ArrowLeft /> {t('返回水面', 'Return to surface')}</button><div><button aria-label={memory.favorite ? t('移出最珍贵记忆', 'Remove from treasured') : t('加入最珍贵记忆', 'Add to treasured')} className={memory.favorite ? 'favorite-active' : ''} onClick={async () => { await memoryRepository.update(id, { favorite: !memory.favorite }); await Promise.all([queryClient.invalidateQueries({ queryKey: ['memory', id] }), queryClient.invalidateQueries({ queryKey: ['memories'] })]) }}><Heart fill={memory.favorite ? 'currentColor' : 'none'} /></button><button disabled={reanalyze.isPending} title={t('重新分析标题、情绪与线索', 'Reanalyze title, emotions and clues')} onClick={() => reanalyze.mutate()}><RefreshCw className={reanalyze.isPending ? 'spin' : ''} /></button><button title={t('修改正文与时间', 'Edit text and time')} onClick={() => { setContent(memory.content); setOccurredAt(beijingDateTimeLocal(new Date(memory.occurredAt))); setEditing(true) }}><Pencil /></button><button onClick={async () => { await memoryRepository.remove(id); navigate('/timeline') }}><Trash2 /></button></div></header>
    <article className="memory-detail"><input ref={fileRef} hidden type="file" multiple accept="image/*,audio/*,video/*" onChange={event => void addAttachments(event.target.files)} /><div className="detail-hero"><span className="emotion-large" style={{ '--emotion': memory.emotionColor } as React.CSSProperties}><i /></span><div className="eyebrow">A MEMORY FROM YOUR PENSIEVE</div><h1>{memory.title}</h1><div className="detail-meta"><span><CalendarDays /> {format(new Date(memory.occurredAt), isEnglish ? 'MMMM d, yyyy · EEEE · HH:mm' : 'yyyy年M月d日 EEEE · HH:mm', { locale })}</span><span className="detail-emotions">{memoryEmotions.map((emotion, index) => <span className={`emotion-pill ${index === 0 ? 'primary' : 'secondary'}`} key={emotion}><i style={{ background: index === 0 ? memory.emotionColor : undefined }} />{emotionLabel(emotion, language)}<small>{index === 0 ? t('主', 'Main') : t('副', 'Sub')}</small></span>)}</span></div><button className="replay-button" onClick={() => setReplay(true)}><Play fill="currentColor" /> {t('沉浸回放', 'Immersive replay')}</button></div>
      <AttachmentGallery attachments={memory.attachments} editing={editing} onAdd={() => isDesktop() ? void addAttachments() : fileRef.current?.click()} onRemove={attachment => void removeAttachment(attachment)} onRename={(attachment, name) => void renameAttachment(attachment, name)} /><section className="memory-story"><div className="story-mark">✦</div>{editing ? <div className="edit-box"><label className="memory-time-editor"><span><CalendarDays /> {t('记忆发生时间 · 北京时间', 'Memory time · Beijing time')}</span><input type="datetime-local" value={occurredAt} onChange={event => setOccurredAt(event.target.value)} /></label><textarea value={content} onChange={e => setContent(e.target.value)} placeholder={t('可以保留文字，也可以只留下附件。', 'Keep text, or leave only the attachments.')} /><div><button onClick={() => setEditing(false)}>{t('取消', 'Cancel')}</button><button className="primary-button" disabled={(!content.trim() && !memory.attachments.length) || !occurredAt || save.isPending} onClick={() => save.mutate()}>{save.isPending ? t('正在保存…', 'Saving…') : t('保存正文与时间', 'Save text and time')}</button></div></div> : <p>{memory.content || t('这段记忆由附件承载。', 'This memory lives in its attachments.')}</p>}</section>
      <section className="memory-clues"><h2>{t('水面留下的线索', 'Clues left on the surface')}</h2><div>{memory.tags.map(tag => <span key={tag.id}>{tag.kind === 'person' ? <UserRound /> : tag.kind === 'place' ? <MapPin /> : <Sparkles />}<b>{tag.label}</b><small>{tag.source === 'ai' ? t('AI 识别', 'AI detected') : t('你的标记', 'Your tag')}</small></span>)}</div></section>
      {!!related.length && <section className="related"><div className="section-title"><div><span className="eyebrow">CONNECTED WHISPERS</span><h2>{t('与它遥相呼应', 'Connected echoes')}</h2></div></div><div className="cards-grid">{related.map(m => <MemoryCard key={m.id} memory={m} />)}</div></section>}
    </article>
  </div>
}

