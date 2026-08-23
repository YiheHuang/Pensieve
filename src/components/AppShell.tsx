import { Archive, Droplets, Home, LockKeyhole, LogOut, Search, Settings, Sparkles, Waves } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useI18n } from '../i18n'
import { isDesktop } from '../services/nativeBridge'

export function AppShell() {
  const { t } = useI18n()
  const nav = [
    { to: '/', label: t('冥想盆', 'Basin'), icon: Home, end: true },
    { to: '/capture', label: t('提取', 'Extract'), icon: Droplets },
    { to: '/search', label: t('沉浸', 'Immerse'), icon: Search },
    { to: '/timeline', label: t('记忆长廊', 'Gallery'), icon: Archive },
    { to: '/echoes', label: t('时光回响', 'Time Echoes'), icon: Waves },
  ]
  const navigate = useNavigate(); const lock = useAppStore(s => s.lock)
  const endMeditation = async () => {
    if (isDesktop()) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    } else lock()
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('/')} aria-label={t('返回冥想盆主页', 'Return to the basin')}><span className="brand-mark"><Sparkles size={20} /></span><span><strong>Pensieve</strong><small>{t('私人记忆星河', 'PRIVATE MEMORY VAULT')}</small></span></button>
      <nav>{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        <NavLink to="/settings"><Settings size={18} /><span>{t('偏好与守护', 'Preferences')}</span></NavLink>
        <button onClick={lock}><LockKeyhole size={18} /><span>{t('锁定记忆库', 'Lock vault')}</span></button>
        <button className="end-meditation" onClick={endMeditation}><LogOut size={18} /><span>{t('结束冥想', 'End meditation')}</span></button>
      </div>
    </aside>
    <main className="main"><Outlet /></main>
  </div>
}
