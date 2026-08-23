import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, CalendarDays, Clock3, Heart, Pencil, Sparkles, Trash2, Waves } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { memoryRepository } from '../services/memoryRepository'
import { timeEchoRepository } from '../services/timeEchoRepository'
import type { TimeEchoProgress } from '../types'
import { useAppStore } from '../stores/appStore'
import { useI18n } from '../i18n'

function beijingDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
function defaultDates() { const today = beijingDate(); const start = new Date(`${today}T00:00:00+08:00`); start.setUTCDate(start.getUTCDate() - 29); return { from: beijingDate(start), to: today } }
function memoryBeijingDate(value: string) { return beijingDate(new Date(value)) }

export function TimeEchoPage() {
  const { t, isEnglish } = useI18n(); const navigate = useNavigate(); const ai = useAppStore(state => state.ai)
  const defaults = useMemo(() => defaultDates(), []); const [from, setFrom] = useState(defaults.from); const [to, setTo] = useState(defaults.to)
  const [favoriteOnly, setFavoriteOnly] = useState(false); const [progress, setProgress] = useState<TimeEchoProgress>(); const [error, setError] = useState(''); const [generating, setGenerating] = useState(false)
  const { data: memories = [] } = useQuery({ queryKey: ['memories', 'active'], queryFn: () => memoryRepository.list('active') })
  const { data: reports = [], refetch } = useQuery({ queryKey: ['time-echoes'], queryFn: () => timeEchoRepository.list() })
  const count = memories.filter(memory => { const day = memoryBeijingDate(memory.occurredAt); return day >= from && day <= to }).length
  const shown = favoriteOnly ? reports.filter(report => report.favorite) : reports
  const generate = async () => {
    setError(''); setGenerating(true); setProgress(undefined)
    try {
      const report = await timeEchoRepository.generate({ fromDate: from, toDate: to, language: isEnglish ? 'en' : 'zh' }, memories, setProgress)
      await refetch(); navigate(`/echoes/${report.id}`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) } finally { setGenerating(false) }
  }
  const rename = async (id: string, title: string) => { const next = window.prompt(t('为这份回响重新命名', 'Rename this echo'), title); if (!next?.trim()) return; await timeEchoRepository.update(id, { title: next.trim() }); await refetch() }
  const remove = async (id: string, title: string) => { if (!window.confirm(t(`彻底删除“${title}”？`, `Delete “${title}” permanently?`))) return; await timeEchoRepository.remove(id); await refetch() }
  const toggleFavorite = async (id: string, favorite: boolean) => { await timeEchoRepository.update(id, { favorite: !favorite }); await refetch() }
  const aiReady = ai.enabled && ai.hasApiKey
  return <div className="page echoes-page">
    <header className="page-header split"><div><div className="eyebrow"><Waves size={14} /> TIME ECHOES</div><h1>{t('时光回响', 'Time Echoes')}</h1><p>{t('选一段时光，让散落的记忆在水面重新彼此照见。', 'Choose a chapter of time and let its memories illuminate one another.')}</p></div><div className="echo-count"><strong>{reports.length}</strong><span>{t('份回响档案', 'echo reports')}</span></div></header>
    <section className="echo-generator">
      <div className="echo-generator-copy"><span><Sparkles /></span><div><h2>{t('聆听一段时光', 'Listen to a chapter')}</h2><p>{t('AI 将从情绪、人物、地点、主题与变化等维度完整回望。', 'AI will reflect across emotions, people, places, themes and change.')}</p></div></div>
      <div className="echo-range"><label><span>{t('从', 'From')}</span><input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label><i /> <label><span>{t('至', 'To')}</span><input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label><div className="range-memory-count"><strong>{count}</strong><span>{t('缕记忆', 'memories')}</span></div></div>
      {!aiReady && <div className="echo-warning">{t('请先在“偏好与守护”中启用 AI 并保存 API 密钥。', 'Enable AI and save an API key in Preferences & Protection first.')} <button onClick={() => navigate('/settings')}>{t('前往设置', 'Open settings')}</button></div>}
      {error && <div className="echo-error">{error}</div>}
      {generating && <div className="echo-progress"><div><i style={{ width: `${Math.max(12, progress ? ((['preparing','batching','synthesizing','saving'].indexOf(progress.stage) + 1) / 4) * 100 : 8)}%` }} /></div><strong>{progress?.message || t('正在整理记忆', 'Preparing memories')}</strong>{progress?.total && progress.total > 1 ? <span>{progress.current} / {progress.total}</span> : null}</div>}
      <button className="echo-generate-button" disabled={generating || !aiReady || count < 1 || from > to} onClick={() => void generate()}><Waves /> {generating ? t('回响正在形成…', 'Echoes are forming…') : t('聆听时光回响', 'Listen to Time Echoes')}</button>
    </section>
    <div className="echo-library-head"><div><Archive /><h2>{t('档案库', 'Archive Library')}</h2></div><button className={favoriteOnly ? 'active' : ''} onClick={() => setFavoriteOnly(value => !value)}><Heart fill={favoriteOnly ? 'currentColor' : 'none'} /> {t('收藏', 'Favorites')}</button></div>
    {!shown.length ? <div className="echo-empty"><Waves /><h3>{favoriteOnly ? t('还没有收藏的回响', 'No favorite echoes yet') : t('档案库仍在静静等待', 'The archive is quietly waiting')}</h3><p>{t('选择一段有记忆的时光，生成第一份属于你的回响。', 'Choose a period with memories to create your first echo.')}</p></div> : <div className="echo-grid">{shown.map(report => <article className="echo-card" key={report.id} onClick={() => navigate(`/echoes/${report.id}`)}><div className="echo-card-glow" /><header><span><Clock3 /> {report.periodStart} — {report.periodEnd}</span><button aria-label={t('收藏', 'Favorite')} onClick={event => { event.stopPropagation(); void toggleFavorite(report.id, report.favorite) }}><Heart fill={report.favorite ? 'currentColor' : 'none'} /></button></header><h3>{report.title}</h3><p>{report.overview}</p><footer><span><CalendarDays /> {report.memoryCount} {t('缕记忆', 'memories')}</span><div><button aria-label={t('重命名', 'Rename')} onClick={event => { event.stopPropagation(); void rename(report.id, report.title) }}><Pencil /></button><button aria-label={t('删除', 'Delete')} onClick={event => { event.stopPropagation(); void remove(report.id, report.title) }}><Trash2 /></button></div></footer></article>)}</div>}
  </div>
}
