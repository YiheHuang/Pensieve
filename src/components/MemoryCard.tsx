import { CalendarDays, Heart, Image, Music2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { Memory } from '../types'
import { emotionLabel, memoryEmotionValues, useI18n } from '../i18n'

export function MemoryCard({ memory, reason, featured = false }: { memory: Memory; reason?: string; featured?: boolean }) {
  const { language, locale, isEnglish } = useI18n()
  const emotions = memoryEmotionValues(memory)
  return <Link to={`/memory/${memory.id}`} className={`memory-card ${featured ? 'featured' : ''}`}>
    <div className="memory-card-glow" style={{ '--emotion': memory.emotionColor } as React.CSSProperties} />
    <div className="memory-card-top">
      <span className="emotion-orb" style={{ background: memory.emotionColor }} />
      <span className="card-emotions">{emotions.map((emotion, index) => <i className={index === 0 ? 'primary' : ''} key={emotion}>{emotionLabel(emotion, language)}</i>)}</span>
      <span className="memory-date"><CalendarDays size={13} /> {format(new Date(memory.occurredAt), isEnglish ? 'MMM d · EEEE' : 'M月d日 EEEE', { locale })}</span>
      {memory.favorite && <Heart size={14} fill="currentColor" />}
    </div>
    <h3>{memory.title}</h3>
    <p>{memory.content}</p>
    <div className="memory-tags">
      {memory.tags.slice(0, 3).map(tag => <span key={tag.id}>{tag.label}</span>)}
      {memory.attachments.some(a => a.kind === 'image') && <Image size={14} />}
      {memory.attachments.some(a => a.kind === 'audio') && <Music2 size={14} />}
    </div>
    {reason && <div className="match-reason"><Sparkles size={13} /> {reason}</div>}
  </Link>
}
