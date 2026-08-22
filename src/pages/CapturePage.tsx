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
    {processing && createPortal(<div className="save-ritual looping" role="status" aria-live="polite"><div className="ritual-wand"><b /><span className="wand-tip" /><span className="wand-memory"><i /><i /><i /></span></div><div className="ritual-bowl"><span className="ritual-water"><i /><i /><i /></span><b /></div><div className="ritual-copy">{mutation.isError ? <><AlertCircle /><h2>{t('整理暂时停在水面', 'Organization paused at the surface')}</h2><p>{String(mutation.error)}</p><div className="ritual-actions"><button onClick={() => mutation.mutate(draft())}>{t('再次提取', 'Try again')}</button><button onClick={returnToEdit}>{t('返回修改', 'Return to edit')}</button></div></> : <><h2>{t('AI 正在从记忆中提取线索', 'AI is extracting your memory')}</h2><p>{t('魔杖会继续将微光送入水中，直到标题、情绪与线索全部整理完成；正文始终保留原文', 'The wand will keep casting until the title, emotions and clues are ready; your original text stays untouched')}</p></>}</div></div>, document.body)}
    <header className="page-header centered"><div className="eyebrow"><Sparkles size={14} /> EXTRACT A MEMORY</div><h1>{t('把想记住的，交给冥想盆', 'Give the basin what you want to remember')}</h1><p>{t('只管写下或说出内容，命名、时间、情绪与线索都可以交给 AI。', 'Write or speak freely. AI can handle the title, time, emotion and clues.')}</p></header>
    <section className="capture-card simplified">
      <div className="capture-main">
        <textarea autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder={t('写下想记住的内容……\n\n也可以加入图片、视频、音频，或直接说出这段记忆。', 'Write what you want to remember…\n\nYou can also add images, video, audio, or speak this memory aloud.')} />
        <div className="capture-toolbar">
          <input ref={inputRef} hidden type="file" multiple accept="image/*,audio/*,video/*" onChange={e => addFiles(e.target.files)} />
          <button onClick={chooseFiles}><Paperclip size={17} /> {t('添加媒体', 'Add media')}</button>
          <button className={recording ? 'recording' : ''} onClick={toggleRecording}><Mic size={17} /> {recording ? t('停止录音', 'Stop recording') : t('语音输入', 'Voice input')}</button>
          <span>{language === 'en' ? `${content.length} characters` : `${content.length} 个字`}</span>
        </div>
        {!!attachments.length && <div className="attachment-strip">{attachments.map(attachment => <div key={attachment.id} className="attachment-chip">{attachment.kind === 'image' ? <Image /> : attachment.kind === 'audio' ? <Mic /> : <Video />}<span>{attachment.name}<small>{(attachment.size / 1024 / 1024).toFixed(1)} MB</small></span><button onClick={() => setAttachments(attachments.filter(item => item.id !== attachment.id))}><X /></button></div>)}</div>}
      </div>
      <details className="capture-advanced" open={advanced} onToggle={event => setAdvanced(event.currentTarget.open)}>
        <summary><span><WandSparkles /> {t('高级选项', 'Advanced options')}</span><small>{t('需要时再补充，留空则由 AI 整理', 'Optional · AI fills blank fields')}</small><ChevronDown /></summary>
        <div className="advanced-grid">
          <label>{t('记忆名称', 'Memory title')}<input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('留空由 AI 命名', 'Leave blank for AI')} /></label>
          <label><span><CalendarDays size={15} /> {t('发生时间 · 北京时间', 'Occurred at · Beijing time')}</span><input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></label>
          <div className="advanced-field"><span>{t('感受 · 第一个为主标签，其余为副标签', 'Feelings · first is primary, the rest are secondary')}</span><div className="emotion-picker">{emotions.map(item => { const index = selectedEmotions.indexOf(item); return <button className={`${index >= 0 ? 'active' : ''} ${index === 0 ? 'primary-emotion' : ''}`} onClick={() => toggleEmotion(item)} key={item}><i />{emotionLabel(item, language)}{index >= 0 && <small>{index === 0 ? t('主', 'Main') : t('副', 'Sub')}</small>}</button> })}</div></div>
          <div className="advanced-field"><span>{t('线索', 'Clues')}</span><div className="tag-input"><input value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={t('人物、地点或主题', 'Person, place or topic')} /><button onClick={addTag}>＋</button></div><div className="selected-tags">{tags.map(item => <button key={item} onClick={() => setTags(tags.filter(value => value !== item))}>#{item} ×</button>)}</div></div>
        </div>
      </details>
      <footer><span><Sparkles size={14} /> {desktopNeedsAi ? <>{t('请先在偏好与守护中启用 AI 整理', 'Enable AI organization in Preferences first')} · <Link to="/settings">{t('前往设置', 'Open settings')}</Link></> : t('进入详情前，会等待 AI 完成全部整理', 'Details open only after AI finishes organizing')}</span><button className="primary-button" disabled={(!content.trim() && !attachments.length) || mutation.isPending || desktopNeedsAi} onClick={() => mutation.mutate(draft())}><DropletIcon /> {t('提取', 'Extract')}</button></footer>
    </section>
  </div>
}
function DropletIcon() { return <span className="tiny-drop">◆</span> }
