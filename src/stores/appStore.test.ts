import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from './appStore'

const setDesktop = (enabled: boolean) => {
  if (enabled) {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} })
  } else {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__')
  }
}

afterEach(() => {
  setDesktop(false)
  useAppStore.setState({ locked: true, hasPin: false, pinHash: '', displayName: '' })
  localStorage.clear()
})

describe('vault PIN state', () => {
  it('trusts the already successful native unlock after a cross-device restore', () => {
    setDesktop(true)
    useAppStore.setState({ locked: true, hasPin: true, pinHash: 'destination-device-pin' })

    expect(useAppStore.getState().unlock('source-vault-pin')).toBe(true)
    expect(useAppStore.getState().locked).toBe(false)
    expect(useAppStore.getState().pinHash).toBe('')
  })

  it('keeps browser development PIN verification local', () => {
    useAppStore.getState().setupPin('2468', '旅人')
    useAppStore.getState().lock()

    expect(useAppStore.getState().unlock('1357')).toBe(false)
    expect(useAppStore.getState().unlock('2468')).toBe(true)
  })
})
