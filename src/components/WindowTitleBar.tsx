import { Minus, Square, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useI18n } from '../i18n'

export function WindowTitleBar() {
  const { t } = useI18n()
  const windowApi = getCurrentWindow()
  return <header className="window-titlebar" data-tauri-drag-region onDoubleClick={() => void windowApi.toggleMaximize()}>
    <div className="window-titlebar-brand" data-tauri-drag-region>
      <span className="window-titlebar-sigil">✦</span>
      <strong data-tauri-drag-region>Pensieve</strong>
      <i data-tauri-drag-region />
      <span data-tauri-drag-region>{t('私人记忆星河', 'A private constellation of memories')}</span>
    </div>
    <div className="window-controls">
      <button aria-label={t('最小化', 'Minimize')} title={t('最小化', 'Minimize')} onClick={() => void windowApi.minimize()}><Minus /></button>
      <button aria-label={t('最大化或还原', 'Maximize or restore')} title={t('最大化或还原', 'Maximize or restore')} onClick={() => void windowApi.toggleMaximize()}><Square /></button>
      <button className="window-close" aria-label={t('关闭', 'Close')} title={t('关闭', 'Close')} onClick={() => void windowApi.close()}><X /></button>
    </div>
  </header>
}
