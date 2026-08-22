import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Image, Mic, Paperclip, Sparkles, Video, WandSparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { memoryRepository } from '../services/memoryRepository'
import type { Attachment } from '../types'
import { isDesktop, nativeBridge } from '../services/nativeBridge'
import { open } from '@tauri-apps/plugin-dialog'
import { playMemoryChime } from '../services/sound'
import { beijingDateTimeLocal } from '../utils/date'
import { emotionLabel, useI18n } from '../i18n'

const emotions = ['欣喜', '宁静', '温暖', '怀念', '勇敢', '难过']

export function CapturePage() {
  const { t, language } = useI18n()
  const navigate = useNavigate(); const queryClient = useQueryClient(); const inputRef = useRef<HTMLInputElement>(null); const recorderRef=useRef<MediaRecorder|null>(null); const chunksRef=useRef<Blob[]>([])
  const [content, setContent] = useState(''); const [title, setTitle] = useState(''); const [date, setDate] = useState(() => beijingDateTimeLocal()); const [emotion, setEmotion] = useState(''); const [tags, setTags] = useState<string[]>([]); const [tag, setTag] = useState(''); const [attachments, setAttachments] = useState<Attachment[]>([]); const [recording, setRecording] = useState(false); const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!saved) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [saved])
  const mutation = useMutation({ mutationFn: memoryRepository.create, onSuccess: memory => { queryClient.invalidateQueries({ queryKey: ['memories'] }); playMemoryChime('store'); setSaved(true); window.setTimeout(() => navigate(`/memory/${memory.id}`), 3800) } })
  const addFiles = (files: FileList | null) => { if (!files) return; setAttachments(current => [...current, ...Array.from(files).map(file => ({ id: crypto.randomUUID(), name: file.name, mimeType: file.type, size: file.size, kind: file.type.startsWith('image') ? 'image' as const : file.type.startsWith('audio') ? 'audio' as const : 'video' as const, url: URL.createObjectURL(file), status: 'ready' as const }))]) }
  const chooseFiles = async () => { if (!isDesktop()) return inputRef.current?.click(); const selected = await open({ multiple: true, filters: [{ name: '记忆媒体', extensions: ['png','jpg','jpeg','webp','gif','mp3','wav','m4a','mp4','mov','webm'] }] }); if (!selected) return; const paths = Array.isArray(selected) ? selected : [selected]; const memoryId = crypto.randomUUID(); const imported = await Promise.all(paths.map(path => nativeBridge.importAttachment(path, memoryId))); setAttachments(current => [...current, ...imported]) }
  const toggleRecording=async()=>{if(recording){recorderRef.current?.stop();setRecording(false);return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const recorder=new MediaRecorder(stream);chunksRef.current=[];recorder.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunksRef.current,{type:recorder.mimeType||'audio/webm'});const name=`声音记忆-${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}).replace(':','-')}.webm`;if(isDesktop()){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const attachment=await nativeBridge.importAttachmentBytes(name,blob.type,btoa(binary),crypto.randomUUID());setAttachments(v=>[...v,attachment])}else setAttachments(v=>[...v,{id:crypto.randomUUID(),name,mimeType:blob.type,size:blob.size,kind:'audio',url:URL.createObjectURL(blob),status:'ready'}])};recorder.start();recorderRef.current=recorder;setRecording(true)}catch{setRecording(false)}}
  const addTag = () => { const value = tag.trim(); if (value && !tags.includes(value)) setTags([...tags, value]); setTag('') }
  return <div className="page capture-page">
    {saved && createPortal(<div className="save-ritual" role="status" aria-live="polite"><div className="ritual-stars">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div><div className="ritual-wand"><b /><span className="wand-tip" /><span className="wand-memory"><i /><i /><i /></span></div><div className="ritual-bowl"><span className="ritual-water"><i /><i /><i /></span><b /></div><div className="ritual-copy"><h2>{t('记忆正在融入冥想盆', 'Your memory is entering the basin')}</h2><p>{t('微光从杖尖离开，在水中慢慢晕开', 'The light leaves the wand and dissolves into the water')}</p></div></div>, document.body)}
    <header className="page-header centered"><div className="eyebrow"><Sparkles size={14} /> CAST A MEMORY</div><h1>{t('把这一刻，轻轻放进水里', 'Place this moment gently into the water')}</h1><p>{t('不必整理，不必完整。只要写下、说出，剩下的交给冥想盆。', 'It need not be polished or complete. Write it, speak it, and leave the rest to the basin.')}</p></header>
    <section className={`capture-card ${saved ? 'saved' : ''}`}>
      <div className="capture-main">
        <input className="title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('给这缕记忆一个名字（也可以留空）', 'Name this memory (optional)')} />
        <textarea autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder={t('今天，有什么瞬间让你想要停下来？\n\n可以是一段对话、一阵风、一个没说出口的念头……', 'What made you pause today?\n\nA conversation, a breeze, or a thought left unspoken…')} />
        <div className="capture-toolbar">
          <input ref={inputRef} hidden type="file" multiple accept="image/*,audio/*,video/*" onChange={e => addFiles(e.target.files)} />
          <button onClick={chooseFiles}><Paperclip size={17} /> {t('添加珍藏', 'Add media')}</button>
          <button className={recording ? 'recording' : ''} onClick={toggleRecording}><Mic size={17} /> {recording ? t('停止并保存声音', 'Stop and save audio') : t('说出记忆', 'Speak a memory')}</button>
          <span>{language === 'en' ? `${content.length} characters` : `${content.length} 个字`}</span>
        </div>
        {!!attachments.length && <div className="attachment-strip">{attachments.map(a => <div key={a.id} className="attachment-chip">{a.kind === 'image' ? <Image /> : a.kind === 'audio' ? <Mic /> : <Video />}<span>{a.name}<small>{(a.size / 1024 / 1024).toFixed(1)} MB</small></span><button onClick={() => setAttachments(attachments.filter(x => x.id !== a.id))}><X /></button></div>)}</div>}
      </div>
      <aside className="capture-aside">
        <div className="ai-hint"><WandSparkles /><div><strong>{t('冥想盆会为你整理', 'The basin will organize it')}</strong><p>{t('保存后自动提取人物、地点、主题和摘要，原文始终不变。', 'People, places, topics and a summary are extracted after saving. Your original words stay unchanged.')}</p></div></div>
        <label><CalendarDays size={16} /> {t('这段记忆发生在 · 北京时间', 'When it happened · Beijing time')}</label><input aria-label={t('记忆发生时间（北京时间）', 'Memory date and time (Beijing time)')} type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
        <label>{t('此刻最接近的感受', 'Closest feeling')} <span>{t('可选', 'Optional')}</span></label><div className="emotion-picker">{emotions.map(item => <button className={emotion === item ? 'active' : ''} onClick={() => setEmotion(emotion === item ? '' : item)} key={item}><i />{emotionLabel(item, language)}</button>)}</div>
        <label>{t('想先放入的线索', 'Clues to add')} <span>{t('可选', 'Optional')}</span></label><div className="tag-input"><input value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={t('人物、地点或主题', 'Person, place or topic')} /><button onClick={addTag}>＋</button></div>
        <div className="selected-tags">{tags.map(t => <button key={t} onClick={() => setTags(tags.filter(x => x !== t))}>#{t} ×</button>)}</div>
      </aside>
      <footer><span><Sparkles size={14} /> {t('保存永远先于 AI 分析', 'Saving always comes before AI analysis')}</span><button className="primary-button" disabled={!content.trim() || mutation.isPending} onClick={() => mutation.mutate({ title, content, occurredAt: date, emotion, tags, attachments })}><DropletIcon /> {mutation.isPending ? t('正在封存…', 'Storing…') : t('让它沉入冥想盆', 'Send it into the basin')}</button></footer>
    </section>
  </div>
}
function DropletIcon() { return <span className="tiny-drop">◆</span> }
