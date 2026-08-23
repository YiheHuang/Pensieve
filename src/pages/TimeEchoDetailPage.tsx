import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, FileImage, Heart, MapPin, Sparkles, Users, Waves } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { timeEchoRepository } from '../services/timeEchoRepository'
import { memoryRepository } from '../services/memoryRepository'
import { buildTimeEchoSlides, resolveTimeEchoNavigation, type TimeEchoSlide, type TimeEchoSlideKind } from '../utils/timeEchoSlides'
import { useI18n } from '../i18n'

const iconFor = (kind: TimeEchoSlideKind) => {
  if (kind === 'people') return <Users />
  if (kind === 'places') return <MapPin />
  if (kind === 'themes') return <FileImage />
  if (kind === 'moment') return <Heart />
  if (kind === 'insights' || kind === 'closing') return <Sparkles />
  return <Waves />
}

export function TimeEchoDetailPage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const { t, language } = useI18n(); const [searchParams, setSearchParams] = useSearchParams(); const touchStart = useRef<number | null>(null)
  const { data: report, refetch, isLoading } = useQuery({ queryKey: ['time-echo', id], queryFn: () => timeEchoRepository.get(id) })
  const slides = useMemo(() => report ? buildTimeEchoSlides(report, language) : [], [report, language])
  const requestedIndex = Number.parseInt(searchParams.get('slide') || '0', 10)
  const index = Number.isFinite(requestedIndex) ? Math.min(Math.max(requestedIndex, 0), Math.max(slides.length - 1, 0)) : 0
  const slide = slides[index]
  const { data: sourceMap = new Map<string, boolean>() } = useQuery({ queryKey: ['time-echo-sources', report?.sourceMemoryIds], enabled: !!report, queryFn: async () => new Map((await Promise.all((report?.sourceMemoryIds || []).map(async sourceId => [sourceId, !!(await memoryRepository.get(sourceId))] as const)))) })
  const exit = useCallback(() => navigate('/echoes'), [navigate])
  const goTo = useCallback((next: number) => {
    if (!slides.length) return
    const bounded = Math.min(Math.max(next, 0), slides.length - 1)
    setSearchParams(bounded ? { slide: String(bounded) } : {}, { replace: true })
  }, [setSearchParams, slides.length])
  const move = useCallback((offset: number) => {
    const destination = resolveTimeEchoNavigation(index, offset, slides.length)
    if (destination === 'exit') { exit(); return }
    goTo(destination)
  }, [exit, goTo, index, slides.length])
  useEffect(() => {
    if (!slides.length || requestedIndex === index) return
    goTo(index)
  }, [goTo, index, requestedIndex, slides.length])
  useEffect(() => {
    if (!report) return
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [report])
  useEffect(() => {
    if (!report) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      if (event.key === 'Escape') { event.preventDefault(); exit() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exit, move, report])
  if (isLoading) return <div className="page echo-detail-loading"><Waves /><span>{t('正在打开回响…', 'Opening the echo…')}</span></div>
  if (!report || !slide) return <div className="page echo-empty"><Waves /><h2>{t('这份回响已不在档案库', 'This echo is no longer in the archive')}</h2><button onClick={exit}>{t('返回档案库', 'Back to archive')}</button></div>
  const openSource = () => { const available = slide.memoryIds.find(sourceId => sourceMap.get(sourceId)); if (available) navigate(`/memory/${available}`) }
  const sourceAvailable = slide.memoryIds.some(sourceId => sourceMap.get(sourceId))
  const favorite = async () => { await timeEchoRepository.update(report.id, { favorite: !report.favorite }); await refetch() }
  return createPortal(<div className={`echo-immersive echo-kind-${slide.kind}`} role="dialog" aria-modal="true" aria-label={t(`沉浸于${report.title}`, `Immersing in ${report.title}`)} onTouchStart={event => { touchStart.current = event.changedTouches[0]?.clientX ?? null }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (touchStart.current === null || end === undefined) return; const distance = end - touchStart.current; touchStart.current = null; if (Math.abs(distance) >= 50) move(distance > 0 ? -1 : 1) }}>
    <div className="immersion-depth depth-one" /><div className="immersion-depth depth-two" />
    <div className="immersion-vortex"><i /><i /><i /><i /></div><div className="echo-immersive-wisps">{Array.from({ length: 9 }, (_, item) => <i style={{ '--i': item } as CSSProperties} key={item} />)}</div>
    <header className="echo-immersive-header"><button onClick={exit}><ArrowLeft /> {t('浮回档案库', 'Return to archive')}</button><span><Waves /> {report.periodStart} — {report.periodEnd}</span><button className={report.favorite ? 'favorite' : ''} aria-label={report.favorite ? t('取消收藏', 'Remove favorite') : t('收藏回响', 'Favorite echo')} onClick={() => void favorite()}><Heart fill={report.favorite ? 'currentColor' : 'none'} /></button></header>
    <main className="echo-immersive-stage">
      <button className="echo-page-arrow previous" disabled={index === 0} aria-label={t('上一页', 'Previous page')} onClick={() => move(-1)}><ChevronLeft /></button>
      <div className="echo-slide" key={slide.id} aria-live="polite"><SlideContent slide={slide} reportTitle={report.title} sourceAvailable={sourceAvailable} openSource={openSource} t={t} /></div>
      <button className={`echo-page-arrow next ${index === slides.length - 1 ? 'finish' : ''}`} aria-label={index === slides.length - 1 ? t('浮回档案库', 'Return to archive') : t('下一页', 'Next page')} onClick={() => move(1)}>{index === slides.length - 1 ? <Waves /> : <ChevronRight />}</button>
    </main>
    <footer className="echo-immersive-progress"><div><strong>{slide.title}</strong><span>{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span></div><nav aria-label={t('报告章节', 'Report chapters')}>{slides.map((item, itemIndex) => <button key={item.id} className={itemIndex === index ? 'active' : ''} aria-label={t(`前往第 ${itemIndex + 1} 页：${item.title}`, `Go to page ${itemIndex + 1}: ${item.title}`)} onClick={() => goTo(itemIndex)} />)}</nav></footer>
  </div>, document.body)
}

function SlideContent({ slide, reportTitle, sourceAvailable, openSource, t }: { slide: TimeEchoSlide; reportTitle: string; sourceAvailable: boolean; openSource: () => void; t: (zh: string, en: string) => string }) {
  if (slide.kind === 'cover') return <article className="echo-slide-content cover"><div className="echo-memory-orb"><i /><i /><i /><Waves /></div><div className="echo-slide-kicker"><Sparkles /> {slide.kicker}</div><h1>{slide.title}</h1><p>{slide.body}</p><time><Clock3 /> {slide.period}</time><small>{t('向右轻触，沉入这段时光', 'Move right to enter this chapter')}</small></article>
  return <article className={`echo-slide-content ${slide.kind}`}>
    <div className="echo-slide-icon">{iconFor(slide.kind)}</div><div className="echo-slide-kicker">{slide.kicker}</div><h1>{slide.title || reportTitle}</h1>
    <div className="echo-slide-scroll"><p>{slide.body}</p>{slide.stats && <div className="echo-slide-stats">{slide.stats.map(stat => <span key={stat.label}><strong>{stat.value}</strong><small>{stat.label}</small></span>)}</div>}{slide.highlights.length > 0 && <ul>{slide.highlights.map((highlight, index) => <li key={`${highlight}-${index}`}>{highlight}</li>)}</ul>}</div>
    {slide.kind === 'moment' && <button className={`echo-enter-memory ${sourceAvailable ? '' : 'missing'}`} disabled={!sourceAvailable} onClick={openSource}>{sourceAvailable ? t('沉入原记忆', 'Enter the original memory') : t('原记忆已不在长廊', 'Original memory is no longer in the gallery')}</button>}
    {slide.kind === 'closing' && <small className="echo-closing-note">{t('—— 来自这段时光的回响', '— An echo from this chapter')}</small>}
  </article>
}
