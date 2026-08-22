import { describe, expect, it } from 'vitest'
import { beijingDateTimeLocal, beijingInputToIso } from './date'

describe('北京时间', () => {
  it('将北京时间输入按 UTC+8 保存', () => {
    expect(beijingInputToIso('2026-08-22T10:00')).toBe('2026-08-22T02:00:00.000Z')
  })

  it('默认输入值使用上海时区而非运行环境时区', () => {
    expect(beijingDateTimeLocal(new Date('2026-08-22T02:05:00Z'))).toBe('2026-08-22T10:05')
  })
})
