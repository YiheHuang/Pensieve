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
      <h1>{hasPin ? t('记忆正在静静等你', 'Your memories are waiting') : t('欢迎来到你的冥想盆', 'Welcome to your Pensieve')}</h1>
      <p>{hasPin ? t('输入专属咒语，让冥想盆再次泛起微光。', 'Enter your private spell and let the basin glow again.') : t('先留下希望冥想盆如何称呼你，再设置一枚只属于此设备的 PIN。', 'Choose how the basin should greet you, then create a PIN for this device.')}</p>
      <form onSubmit={submit}>
        {!hasPin && <><label htmlFor="display-name"><UserRound size={17} /> {t('你的称呼', 'Your name')} <small>{t('可选，之后仍可修改', 'Optional · editable later')}</small></label><input id="display-name" className="name-input" value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder={t('例如：小满', 'For example: Luna')} /></>}
        <label htmlFor="vault-pin"><KeyRound size={17} /> {hasPin ? t('解锁 PIN', 'Unlock PIN') : t('设置 PIN', 'Create PIN')}</label>
        <input id="vault-pin" autoFocus type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} maxLength={8} placeholder="••••" />
        {!hasPin && <input aria-label={t('再次输入 PIN', 'Confirm PIN')} type="password" inputMode="numeric" value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={8} placeholder={t('再次输入', 'Enter again')} />}
        {error && <span className="form-error">{error}</span>}
        <button className="primary-button" type="submit"><ShieldCheck size={18} /> {hasPin ? t('唤醒冥想盆', 'Awaken the basin') : t('创建私人记忆库', 'Create private vault')}</button>
      </form>
      <small>{t('PIN 只保存在本机 · 忘记后需通过备份恢复', 'Your PIN stays on this device · Restore from backup if forgotten')}</small>
    </section>
  </div>
}
