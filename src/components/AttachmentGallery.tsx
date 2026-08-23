import { useEffect, useState } from 'react'
import { FileWarning, Image as ImageIcon, Music2, Plus, Trash2, Video } from 'lucide-react'
import type { Attachment } from '../types'
import { isDesktop, nativeBridge } from '../services/nativeBridge'
import { useI18n } from '../i18n'

function MediaItem({ attachment }: { attachment: Attachment }) {
  const { t } = useI18n(); const [src, setSrc] = useState(attachment.url); const [failed, setFailed] = useState(false)
  useEffect(() => { let active = true; if (isDesktop() && attachment.encryptedPath) { nativeBridge.getAttachmentData(attachment.encryptedPath).then(data => { if (active) setSrc(`data:${attachment.mimeType};base64,${data}`) }).catch(() => setFailed(true)) } return () => { active = false } }, [attachment])
  if (failed) return <div className="media-failed"><FileWarning /><span>{t('这缕记忆暂时没有回应', 'This memory fragment is quiet for now')}</span></div>
  if (!src) return <div className="media-loading"><span className="shimmer" />{attachment.kind === 'image' ? <ImageIcon /> : attachment.kind === 'audio' ? <Music2 /> : <Video />}<small>{t('正在唤醒这缕记忆', 'Awakening this memory fragment')}</small></div>
  if (attachment.kind === 'image') return <figure className="image-memory"><img src={src} alt={t('记忆中的画面', 'A scene from this memory')} /></figure>
  if (attachment.kind === 'audio') return <div className="audio-memory"><Music2 /><div><audio aria-label={t('记忆中的声音', 'Sound from this memory')} controls src={src} />{attachment.transcript && <p>“{attachment.transcript}”</p>}</div></div>
  return <figure className="video-memory"><video aria-label={t('记忆中的影像', 'Video from this memory')} controls src={src} /></figure>
}

interface AttachmentGalleryProps {
  attachments: Attachment[]
  editing?: boolean
  onAdd?: () => void
  onRemove?: (attachment: Attachment) => void
  onRename?: (attachment: Attachment, name: string) => void
}

export function AttachmentGallery({ attachments, editing = false, onAdd, onRemove, onRename }: AttachmentGalleryProps) {
  const { t } = useI18n()
  if (!attachments.length && !editing) return null
  return <section className={`attachment-gallery ${editing ? 'is-editing' : ''}`}>
    <header><div><div className="eyebrow">MEMORY FRAGMENTS</div><h2>{t('这一刻留下的声音与光', 'Sound and light from this moment')}</h2></div>{editing && <button className="attachment-add" onClick={onAdd}><Plus /> {t('添加附件', 'Add attachment')}</button>}</header>
    {attachments.length ? <div>{attachments.map(attachment => <div className="attachment-edit-item" key={attachment.id}><MediaItem attachment={attachment} />{editing && <div className="attachment-edit-controls"><input defaultValue={attachment.name} aria-label={t('附件名称', 'Attachment name')} onBlur={event => onRename?.(attachment, event.target.value)} /><button aria-label={t('删除附件', 'Delete attachment')} onClick={() => onRemove?.(attachment)}><Trash2 /></button></div>}</div>)}</div> : <div className="attachment-empty"><ImageIcon /><span>{t('这段记忆还没有附件', 'This memory has no attachments yet')}</span></div>}
  </section>
}
