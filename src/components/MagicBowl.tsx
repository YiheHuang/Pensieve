import { useI18n } from '../i18n'

export function MagicBowl({ compact = false, active = false }: { compact?: boolean; active?: boolean }) {
  const { t } = useI18n()
  return <div className={`magic-bowl-scene ${compact ? 'compact' : ''} ${active ? 'is-active' : ''}`} aria-label={t('流动着记忆微光的魔法冥想盆', 'A meditation basin flowing with memory light')}>
    <div className="memory-wisp wisp-a" /><div className="memory-wisp wisp-b" /><div className="memory-wisp wisp-c" />
    <div className="bowl-rim"><div className="bowl-water"><span className="water-ring ring-one" /><span className="water-ring ring-two" /></div></div>
    <div className="bowl-body"><span className="bowl-gem" /><span className="bowl-engraving">✦　☾　✦</span></div>
    <div className="bowl-foot" /><div className="bowl-shadow" />
  </div>
}
