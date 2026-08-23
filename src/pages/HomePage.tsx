import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Droplets, Quote, Search, Shuffle, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { MagicBowl } from '../components/MagicBowl'
import { MemoryCard } from '../components/MemoryCard'
import { memoryRepository } from '../services/memoryRepository'
import { differenceInCalendarDays, format } from 'date-fns'
import { useI18n } from '../i18n'
import { useAppStore } from '../stores/appStore'

export function HomePage() {
  const { t, locale, isEnglish } = useI18n()
  const displayName = useAppStore(state => state.displayName)
  const navigate = useNavigate(); const { data: memories = [] } = useQuery({ queryKey: ['memories'], queryFn: () => memoryRepository.list() })
  const random = async () => { const m = await memoryRepository.random(); if (m) navigate(`/memory/${m.id}`) }
  const beijingNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  const daily = memories.length ? memories[Math.floor(beijingNow.getTime() / 86400000) % memories.length] : undefined
  const daysAgo = daily ? Math.max(0, differenceInCalendarDays(beijingNow, new Date(daily.occurredAt))) : 0
  const name = displayName.trim(); const zhName = name ? `，${name}` : ''; const enName = name ? `, ${name}` : ''
  const greeting = beijingNow.getHours() < 12 ? t(`早上好${zhName}`, `Good morning${enName}`) : beijingNow.getHours() < 18 ? t(`下午好${zhName}`, `Good afternoon${enName}`) : t(`晚上好${zhName}`, `Good evening${enName}`)
  return <div className="page home-page">
    <header className="page-header sanctuary-header"><div className="eyebrow"><Sparkles size={14} /> {greeting}</div><h1>{t('收藏一缕微光', 'Keep a glimmer')}</h1><div className="moon-phase">☾ <span>{format(beijingNow, isEnglish ? 'MMMM · yyyy' : 'M月 · yyyy', { locale })}</span></div></header>
    <section className="hero-bowl">
      <div className="hero-copy"><span className="soft-label">{t('水面微光', 'LIGHT BENEATH THE WATER')}</span><h2>{isEnglish ? <>{memories.length} memories<br />rest below</> : <>{memories.length} 缕记忆<br />沉在水下</>}</h2>
        <div className="hero-actions"><Link className="primary-button" to="/capture"><Droplets size={18} /> {t('提取', 'Extract')}</Link><Link className="ghost-button" to="/search"><Search size={18} /> {t('进入沉浸', 'Enter immersion')}</Link></div>
      </div><MagicBowl />
      <button className="random-memory" onClick={random}><Shuffle size={16} /><strong>{t('浮现一刻', 'Surface a moment')}</strong><ArrowRight size={15} /></button>
    </section>
    <section className="home-grid">
      <div className="section-block recent-block"><div className="section-title"><div><span className="eyebrow">{t('水下私语', 'RECENT WHISPERS')}</span><h2>{t('近岸回声', 'Near echoes')}</h2></div><Link to="/timeline">{t('走进长廊', 'Enter the gallery')} <ArrowRight size={15} /></Link></div>
        <div className="cards-grid">{memories.slice(0, 3).map(m => <MemoryCard memory={m} key={m.id} />)}</div>
      </div>
      <aside className="daily-echo"><Quote size={22} /><span className="eyebrow">{t('今日回响', 'TODAY’S ECHO')}</span>{daily ? <><blockquote>“{daily.content}”</blockquote><p>{daysAgo === 0 ? t('今日', 'Today') : isEnglish ? `${daysAgo} days ago` : `${daysAgo} 天前`}</p><Link to={`/memory/${daily.id}`}><BookOpen size={15} /> {t('沉入此刻', 'Enter this moment')}</Link></> : <blockquote>{t('水面静候第一缕回响', 'The surface awaits its first echo')}</blockquote>}</aside>
    </section>
  </div>
}
