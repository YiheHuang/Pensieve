import { Archive, Droplets, Home, LockKeyhole, Search, Settings, Sparkles } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useI18n } from '../i18n'

export function AppShell() {
  const { t } = useI18n()
  const nav = [
    { to: '/', label: t('冥想盆', 'Basin'), icon: Home, end: true },
    { to: '/capture', label: t('存入记忆', 'Store'), icon: Droplets },
    { to: '/search', label: t('沉浸', 'Immerse'), icon: Search },
    { to: '/timeline', label: t('记忆长廊', 'Gallery'), icon: Archive },
  ]
  const navigate = useNavigate(); const lock = useAppStore(s => s.lock)
  return <div className="app-shell">
    <div className="ambient-stars" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('/')} aria-label={t('返回冥想盆主页', 'Return to the basin')}><span className="brand-mark"><Sparkles size={20} /></span><span><strong>Pensieve</strong><small>{t('私人记忆星河', 'PRIVATE MEMORY VAULT')}</small></span></button>
      <nav>{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings"><Settings size={18} /><span>{t('偏好与守护', 'Preferences')}</span></NavLink>
        <button onClick={lock}><LockKeyhole size={18} /><span>{t('锁定记忆库', 'Lock vault')}</span></button>
        <div className="privacy-note"><span>✦</span><p>{t('所有记忆优先', 'Memories stay')}<br />{t('保存在这台设备', 'on this device')}</p></div>
      </div>
    </aside>
    <main className="main"><Outlet /></main>
  </div>
}
