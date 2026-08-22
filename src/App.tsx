import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LockScreen } from './components/LockScreen'
import { CapturePage } from './pages/CapturePage'
import { HomePage } from './pages/HomePage'
import { MemoryDetailPage } from './pages/MemoryDetailPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { TimelinePage } from './pages/TimelinePage'
import { useAppStore } from './stores/appStore'
import { isDesktop } from './services/nativeBridge'
import { WindowTitleBar } from './components/WindowTitleBar'
import './styles/app.css'
import './styles/media.css'

export default function App() {
  const { locked, hasPin, reduceMotion } = useAppStore()
  const desktop = isDesktop()
  useEffect(() => { document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false' }, [reduceMotion])
  const content = !hasPin || locked ? <LockScreen /> : <Routes><Route element={<AppShell />}><Route index element={<HomePage />} /><Route path="capture" element={<CapturePage />} /><Route path="search" element={<SearchPage />} /><Route path="timeline" element={<TimelinePage />} /><Route path="memory/:id" element={<MemoryDetailPage />} /><Route path="settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>
  return <div className={desktop ? 'desktop-frame' : undefined}>{desktop && <WindowTitleBar />}{content}</div>
}
