import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Droplets, Quote, Search, Shuffle, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { MagicBowl } from '../components/MagicBowl'
import { MemoryCard } from '../components/MemoryCard'
import { memoryRepository } from '../services/memoryRepository'
import { differenceInCalendarDays, format } from 'date-fns'
import { useI18n } from '../i18n'

export function HomePage() {
  const { t, locale, isEnglish } = useI18n()
  const navigate = useNavigate(); const { data: memories = [] } = useQuery({ queryKey: ['memories'], queryFn: () => memoryRepository.list() })
  const random = async () => { const m = await memoryRepository.random(); if (m) navigate(`/memory/${m.id}`) }
  const beijingNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  const daily = memories.length ? memories[Math.floor(beijingNow.getTime() / 86400000) % memories.length] : undefined
  const daysAgo = daily ? Math.max(0, differenceInCalendarDays(beijingNow, new Date(daily.occurredAt))) : 0
  const greeting = beijingNow.getHours() < 12 ? t('早上好，一和', 'Good morning, Yihe') : beijingNow.getHours() < 18 ? t('下午好，一和', 'Good afternoon, Yihe') : t('晚上好，一和', 'Good evening, Yihe')
  return <div className="page home-page">
    <header className="page-header home-header"><div><div className="eyebrow"><Sparkles size={14} /> {greeting}</div><h1>{t('有些微光，值得被好好收藏。', 'Some glimmers deserve to be treasured.')}</h1><p>{t('这里没有必须完成的记录，只有想留下的时刻。', 'Nothing here is an obligation—only moments worth keeping.')}</p></div><div className="moon-phase">☾ <span>{format(beijingNow, isEnglish ? 'MMMM · yyyy' : 'M月 · yyyy', { locale })}</span></div></header>
    <section className="hero-bowl">
      <div className="hero-copy"><span className="soft-label">{t('你的冥想盆正在呼吸', 'Your meditation basin is breathing')}</span><h2>{isEnglish ? <>{memories.length} memories<br />rest beneath the stars</> : <>{memories.length} 缕记忆<br />在星河中安睡</>}</h2><p>{t('每一次存入，都让你的生命图谱更加明亮。', 'Every memory adds another light to the map of your life.')}</p>
        <div className="hero-actions"><Link className="primary-button" to="/capture"><Droplets size={18} /> {t('存入一缕记忆', 'Store a memory')}</Link><Link className="ghost-button" to="/search"><Search size={18} /> {t('进入沉浸', 'Enter immersion')}</Link></div>
      </div><MagicBowl />
      <button className="random-memory" onClick={random}><Shuffle size={16} /><span>{t('让冥想盆为你', 'Let the basin')}<br /><strong>{t('随机浮现一刻', 'surface a moment')}</strong></span><ArrowRight size={15} /></button>
    </section>
    <section className="home-grid">
      <div className="section-block recent-block"><div className="section-title"><div><span className="eyebrow">RECENT WHISPERS</span><h2>{t('最近的记忆回声', 'Recent echoes')}</h2></div><Link to="/timeline">{t('走进记忆长廊', 'Enter the memory gallery')} <ArrowRight size={15} /></Link></div>
        <div className="cards-grid">{memories.slice(0, 3).map(m => <MemoryCard memory={m} key={m.id} />)}</div>
      </div>
      <aside className="daily-echo"><Quote size={22} /><span className="eyebrow">{t('今日回响', 'TODAY’S ECHO')}</span>{daily ? <><blockquote>“{daily.summary || daily.content}”</blockquote><p>{daysAgo === 0 ? t('来自今天的记忆', 'A memory from today') : isEnglish ? `A memory from ${daysAgo} days ago` : `来自 ${daysAgo} 天前的记忆`}</p><Link to={`/memory/${daily.id}`}><BookOpen size={15} /> {t('再读一次', 'Read again')}</Link></> : <><blockquote>{t('第一缕回响正在等待。', 'Your first echo is waiting.')}</blockquote><p>{t('存入记忆后，它会在这里重新出现。', 'Store a memory and it will return here.')}</p></>}</aside>
    </section>
  </div>
}
