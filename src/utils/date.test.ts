import { describe, expect, it } from 'vitest'
import { beijingDateTimeLocal, beijingInputToIso, resolveCaptureOccurredAt } from './date'

describe('北京时间', () => {
  it('将北京时间输入按 UTC+8 保存', () => {
    expect(beijingInputToIso('2026-08-22T10:00')).toBe('2026-08-22T02:00:00.000Z')
  })

  it('默认输入值使用上海时区而非运行环境时区', () => {
    expect(beijingDateTimeLocal(new Date('2026-08-22T02:05:00Z'))).toBe('2026-08-22T10:05')
  })

  it('未修改时间时以首次提交时刻为准并在重试时保持不变', () => {
    const first = resolveCaptureOccurredAt('2023-10-01T09:00', false, undefined, new Date('2026-08-30T13:15:00Z'))
    expect(first).toBe('2026-08-30T21:15')
    expect(resolveCaptureOccurredAt('2023-10-01T09:00', false, first, new Date('2026-08-30T14:00:00Z'))).toBe(first)
  })

  it('用户手动设置的时间保持原值', () => {
    expect(resolveCaptureOccurredAt('2024-03-02T08:30', true, undefined, new Date('2026-08-30T13:15:00Z'))).toBe('2024-03-02T08:30')
  })
})
