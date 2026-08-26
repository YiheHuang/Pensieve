import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, ChevronDown, Image, Mic, Paperclip, Sparkles, Video, WandSparkles, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { memoryRepository } from '../services/memoryRepository'
import type { Attachment, MemoryDraft } from '../types'
import { isDesktop, nativeBridge } from '../services/nativeBridge'
import { open } from '@tauri-apps/plugin-dialog'
import { playMemoryChime } from '../services/sound'
import { beijingDateTimeLocal } from '../utils/date'
import { emotionLabel, useI18n } from '../i18n'
import { useAppStore } from '../stores/appStore'

const emotions = ['欣喜', '宁静', '温暖', '怀念', '勇敢', '难过']

export function CapturePage() {
  const { t, language } = useI18n()
  const aiEnabled = useAppStore(state => state.ai.enabled)
  const navigate = useNavigate(); const queryClient = useQueryClient(); const inputRef = useRef<HTMLInputElement>(null); const recorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const pendingIdRef = useRef<string | null>(null)
  const [content, setContent] = useState(''); const [title, setTitle] = useState(''); const [date, setDate] = useState(() => beijingDateTimeLocal()); const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]); const [tags, setTags] = useState<string[]>([]); const [tag, setTag] = useState(''); const [attachments, setAttachments] = useState<Attachment[]>([]); const [recording, setRecording] = useState(false); const [processing, setProcessing] = useState(false); const [advanced, setAdvanced] = useState(false)
  useEffect(() => {
    if (!processing) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [processing])
  const draft = (): MemoryDraft => ({ title, content, occurredAt: date, emotion: selectedEmotions[0], emotions: selectedEmotions, tags, attachments })
  const mutation = useMutation({
    mutationFn: async (memoryDraft: MemoryDraft) => {
      let id = pendingIdRef.current
      if (!id) { const created = await memoryRepository.create(memoryDraft); id = created.id; pendingIdRef.current = id } else { await memoryRepository.updateDraft(id, memoryDraft) }
      try { return await memoryRepository.analyze(id) } catch (error) { await memoryRepository.update(id, { aiStatus: 'failed' }); throw error }
    },
    onMutate: () => setProcessing(true),
    onSuccess: memory => { queryClient.invalidateQueries({ queryKey: ['memories'] }); playMemoryChime('store'); navigate(`/memory/${memory.id}`) },
  })
  const addFiles = (files: FileList | null) => { if (!files) return; setAttachments(current => [...current, ...Array.from(files).map(file => ({ id: crypto.randomUUID(), name: file.name, mimeType: file.type, size: file.size, kind: file.type.startsWith('image') ? 'image' as const : file.type.startsWith('audio') ? 'audio' as const : 'video' as const, url: URL.createObjectURL(file), status: 'ready' as const }))]) }
  const chooseFiles = async () => { if (!isDesktop()) return inputRef.current?.click(); const selected = await open({ multiple: true, filters: [{ name: t('记忆媒体', 'Memory media'), extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp3', 'wav', 'm4a', 'mp4', 'mov', 'webm'] }] }); if (!selected) return; const paths = Array.isArray(selected) ? selected : [selected]; const memoryId = crypto.randomUUID(); const imported = await Promise.all(paths.map(path => nativeBridge.importAttachment(path, memoryId))); setAttachments(current => [...current, ...imported]) }
  const toggleRecording = async () => { if (recording) { recorderRef.current?.stop(); setRecording(false); return } try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); chunksRef.current = []; recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }; recorder.onstop = async () => { stream.getTracks().forEach(track => track.stop()); const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }); const name = `${t('声音记忆', 'Voice-memory')}-${Date.now()}.webm`; if (isDesktop()) { const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); const attachment = await nativeBridge.importAttachmentBytes(name, blob.type, btoa(binary), crypto.randomUUID()); setAttachments(value => [...value, attachment]) } else setAttachments(value => [...value, { id: crypto.randomUUID(), name, mimeType: blob.type, size: blob.size, kind: 'audio', url: URL.createObjectURL(blob), status: 'ready' }]) }; recorder.start(); recorderRef.current = recorder; setRecording(true) } catch { setRecording(false) } }
  const addTag = () => { const value = tag.trim(); if (value && !tags.includes(value)) setTags([...tags, value]); setTag('') }
  const toggleEmotion = (emotion: string) => setSelectedEmotions(current => current.includes(emotion) ? current.filter(value => value !== emotion) : [...current, emotion].slice(0, 4))
  const returnToEdit = () => { mutation.reset(); setProcessing(false) }
  const desktopNeedsAi = isDesktop() && !aiEnabled

  return <div className="page capture-page simple-capture">
    {processing && createPortal(<div className="save-ritual looping" role="status" aria-live="polite"><div className="ritual-wand"><b /><span className="wand-tip" /><span className="wand-memory"><i /><i /><i /></span></div><div className="ritual-bowl"><span className="ritual-water"><i /><i /><i /></span><b /></div><div className="ritual-copy">{mutation.isError ? <><AlertCircle /><h2>{t('微光停在水面', 'The light rests at the surface')}</h2><p>{String(mutation.error)}</p><div className="ritual-actions"><button onClick={() => mutation.mutate(draft())}>{t('再次提取', 'Try again')}</button><button onClick={returnToEdit}>{t('返回', 'Return')}</button></div></> : <><h2>{t('记忆正在沉入水中', 'The memory is entering the water')}</h2><p>{t('静候回响', 'Await the echo')}</p></>}</div></div>, document.body)}
    <header className="page-header sanctuary-header"><div className="eyebrow"><Sparkles size={14} /> {t('记忆仪式', 'MEMORY RITUAL')}</div><h1>{t('让这一刻沉入水中', 'Let this moment enter the water')}</h1></header>
    <section className="capture-card simplified">
      <div className="capture-main">
        <div className="memory-writing-surface">
          <textarea autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder={t('写下这段记忆…', 'Write this memory…')} />
          <div className="capture-toolbar">
            <input ref={inputRef} hidden type="file" multiple accept="image/*,audio/*,video/*" onChange={e => addFiles(e.target.files)} />
            <button onClick={chooseFiles}><Paperclip size={17} /> {t('媒体', 'Media')}</button>
            <button className={recording ? 'recording' : ''} onClick={toggleRecording}><Mic size={17} /> {recording ? t('收声', 'Stop') : t('声音', 'Voice')}</button>
          </div>
          {!!attachments.length && <div className="attachment-strip">{attachments.map(attachment => <div key={attachment.id} className="attachment-chip">{attachment.kind === 'image' ? <Image /> : attachment.kind === 'audio' ? <Mic /> : <Video />}<span>{attachment.name}<small>{(attachment.size / 1024 / 1024).toFixed(1)} MB</small></span><button onClick={() => setAttachments(attachments.filter(item => item.id !== attachment.id))}><X /></button></div>)}</div>}
        </div>
      </div>
      <details className="capture-advanced" open={advanced} onToggle={event => setAdvanced(event.currentTarget.open)}>
        <summary><span><WandSparkles /> {t('水下线索', 'Beneath the surface')}</span><ChevronDown /></summary>
        <div className="advanced-grid">
          <label>{t('记忆之名', 'Memory name')}<input value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label><span><CalendarDays size={15} /> {t('时光', 'Time')}</span><input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></label>
          <div className="advanced-field"><span>{t('情绪', 'Emotions')}</span><div className="emotion-picker">{emotions.map(item => { const index = selectedEmotions.indexOf(item); return <button className={`${index >= 0 ? 'active' : ''} ${index === 0 ? 'primary-emotion' : ''}`} onClick={() => toggleEmotion(item)} key={item}><i />{emotionLabel(item, language)}{index >= 0 && <small>{index === 0 ? t('主', 'Main') : t('副', 'Sub')}</small>}</button> })}</div></div>
          <div className="advanced-field"><span>{t('线索', 'Clues')}</span><div className="tag-input"><input aria-label={t('加入线索', 'Add a clue')} value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} /><button onClick={addTag}>＋</button></div><div className="selected-tags">{tags.map(item => <button key={item} onClick={() => setTags(tags.filter(value => value !== item))}>#{item} ×</button>)}</div></div>
        </div>
      </details>
      <footer><span>{desktopNeedsAi && <><Sparkles size={14} /> {t('先唤醒冥想盆的智慧', 'Awaken the basin first')} · <Link to="/settings">{t('前往', 'Open')}</Link></>}</span><button className="primary-button" disabled={(!content.trim() && !attachments.length) || mutation.isPending || desktopNeedsAi} onClick={() => mutation.mutate(draft())}><DropletIcon /> {t('提取', 'Extract')}</button></footer>
    </section>
  </div>
}
function DropletIcon() { return <span className="tiny-drop">◆</span> }
