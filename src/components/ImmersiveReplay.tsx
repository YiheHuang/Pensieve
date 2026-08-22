import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Pause, Sparkles, Volume2 } from 'lucide-react'
import type { Attachment, Memory } from '../types'
import { isDesktop, nativeBridge } from '../services/nativeBridge'
import { playMemoryChime } from '../services/sound'
import { emotionLabel, memoryEmotionValues, useI18n } from '../i18n'

function ImmersiveMedia({ attachment, onEnded, loadingLabel }: { attachment: Attachment; onEnded: () => void; loadingLabel: string }) {
  const [src, setSrc] = useState(attachment.url)
  useEffect(() => {
    let active = true
    if (isDesktop() && attachment.encryptedPath) {
      nativeBridge.getAttachmentData(attachment.encryptedPath).then(data => {
        if (active) setSrc(`data:${attachment.mimeType};base64,${data}`)
      }).catch(() => undefined)
    }
    return () => { active = false }
  }, [attachment])
  if (!src) return <div className="immersive-loading"><Sparkles /><span>{loadingLabel}</span></div>
  if (attachment.kind === 'image') return <img src={src} alt={attachment.name} />
  if (attachment.kind === 'video') return <video src={src} autoPlay muted controls onEnded={onEnded} />
  return <div className="immersive-audio"><Volume2 /><strong>{attachment.name}</strong><audio src={src} autoPlay controls onEnded={onEnded} />{attachment.transcript && <p>{attachment.transcript}</p>}</div>
}

export function ImmersiveReplay({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const { t, language } = useI18n()
  const [index, setIndex] = useState(0)
  const fragments = useMemo(() => memory.attachments, [memory.attachments])
  const move = useCallback((offset: number) => setIndex(current => fragments.length ? (current + offset + fragments.length) % fragments.length : 0), [fragments.length])
  useEffect(() => { playMemoryChime('retrieve') }, [])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
  useEffect(() => {
    if (fragments.length < 2 || fragments[index]?.kind !== 'image') return
    const timer = window.setTimeout(() => move(1), 8000)
    return () => window.clearTimeout(timer)
  }, [index, fragments, move])
  return createPortal(<div className="immersive-replay" role="dialog" aria-modal="true" aria-label={t(`沉浸于${memory.title}`, `Immersing in ${memory.title}`)}>
    <div className="immersion-depth depth-one" /><div className="immersion-depth depth-two" />
    <div className="immersion-vortex"><i /><i /><i /><i /></div>
    <header><span><Sparkles /> {t('正在进入这缕记忆', 'ENTERING THIS MEMORY')}</span><button onClick={onClose}><Pause /> {t('浮回水面', 'Return to surface')}</button></header>
    <main>
      <div className="immersive-media-shell">
        <div className="immersive-halo" />
        {fragments.length ? <ImmersiveMedia key={fragments[index].id} attachment={fragments[index]} loadingLabel={t('正在凝聚这一片记忆…', 'Gathering this fragment…')} onEnded={() => move(1)} /> : <div className="memory-light-core"><Sparkles /></div>}
      </div>
      <div className="immersive-copy"><span>{memoryEmotionValues(memory).map(emotion => emotionLabel(emotion, language)).join(' · ')}　/　{memory.title}</span><p>{memory.content}</p></div>
      {fragments.length > 1 && <nav><button onClick={() => move(-1)}><ChevronLeft /></button><div>{fragments.map((item, i) => <button aria-label={t(`查看片段 ${i + 1}`, `View fragment ${i + 1}`)} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} key={item.id} />)}</div><button onClick={() => move(1)}><ChevronRight /></button></nav>}
    </main>
    <footer>{t('放慢呼吸，让声音、影像与文字从水中经过', 'Breathe slowly; let sound, image and words pass through the water')}</footer>
  </div>, document.body)
}
