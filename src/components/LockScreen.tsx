import { useState } from 'react'
import { KeyRound, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { MagicBowl } from './MagicBowl'
import { isDesktop, nativeBridge } from '../services/nativeBridge'
import { useI18n } from '../i18n'

export function LockScreen() {
  const { t } = useI18n()
  const { hasPin, setupPin, unlock } = useAppStore(); const [name, setName] = useState(''); const [pin, setPin] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!/^\d{4,8}$/.test(pin)) return setError(t('请输入 4–8 位数字', 'Enter 4–8 digits'))
    if (!hasPin) { if (pin !== confirm) return setError(t('两次输入不一致', 'The two PINs do not match')); try { if (isDesktop()) await nativeBridge.initialize(pin); setupPin(pin, name) } catch (error) { setError(String(error)) } }
    else { try { if (isDesktop()) await nativeBridge.unlock(pin); if (!unlock(pin)) setError(t('咒语似乎不对，再想一想', 'That spell does not seem right')) } catch { setError(t('咒语似乎不对，再想一想', 'That spell does not seem right')) } }
  }
  return <div className="lock-screen">
    <div className="lock-aurora" /><section className="lock-panel">
      <MagicBowl compact />
      <div className="eyebrow"><Sparkles size={14} /> PENSIEVE</div>
      <h1>{hasPin ? t('水面静候', 'The water awaits') : t('初见冥想盆', 'Your first reflection')}</h1>
      <form onSubmit={submit}>
        {!hasPin && <><label htmlFor="display-name"><UserRound size={17} /> {t('称呼', 'Name')}</label><input id="display-name" className="name-input" value={name} onChange={e => setName(e.target.value)} maxLength={24} /></>}
        <label htmlFor="vault-pin"><KeyRound size={17} /> {t('咒语', 'Spell')}</label>
        <div className="water-input-shell lock-spell-surface"><input id="vault-pin" autoFocus type="password" inputMode="numeric" autoComplete={hasPin ? 'current-password' : 'new-password'} value={pin} onChange={e => setPin(e.target.value)} maxLength={8} placeholder="••••" /></div>
        {!hasPin && <div className="water-input-shell lock-spell-surface"><input aria-label={t('再次输入咒语', 'Confirm spell')} type="password" inputMode="numeric" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={8} /></div>}
        {error && <span className="form-error">{error}</span>}
        <button className="primary-button" type="submit"><ShieldCheck size={18} /> {hasPin ? t('唤醒', 'Awaken') : t('封存咒语', 'Seal the spell')}</button>
      </form>
    </section>
  </div>
}
