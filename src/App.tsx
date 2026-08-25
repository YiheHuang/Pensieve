import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LockScreen } from './components/LockScreen'
import { PensieveCursor } from './components/PensieveCursor'
import { CapturePage } from './pages/CapturePage'
import { HomePage } from './pages/HomePage'
import { MemoryDetailPage } from './pages/MemoryDetailPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { TimelinePage } from './pages/TimelinePage'
import { TimeEchoPage } from './pages/TimeEchoPage'
import { TimeEchoDetailPage } from './pages/TimeEchoDetailPage'
import { useAppStore } from './stores/appStore'
import './styles/app.css'
import './styles/media.css'

export default function App() {
  const { locked, hasPin, reduceMotion } = useAppStore()
  useEffect(() => { document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false' }, [reduceMotion])
  const content = !hasPin || locked ? <LockScreen /> : <Routes><Route element={<AppShell />}><Route index element={<HomePage />} /><Route path="capture" element={<CapturePage />} /><Route path="search" element={<SearchPage />} /><Route path="timeline" element={<TimelinePage />} /><Route path="echoes" element={<TimeEchoPage />} /><Route path="echoes/:id" element={<TimeEchoDetailPage />} /><Route path="memory/:id" element={<MemoryDetailPage />} /><Route path="settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>
  return <><PensieveCursor reduceMotion={reduceMotion} />{content}</>
}
