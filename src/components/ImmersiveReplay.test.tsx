import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImmersiveProse } from './ImmersiveReplay'

describe('immersive memory prose', () => {
  it('keeps every authored line break, including blank lines', () => {
    const { container } = render(<ImmersiveProse>{'第一行\n\n第三行'}</ImmersiveProse>)

    expect(container.querySelectorAll('br')).toHaveLength(2)
    expect(container.textContent).toBe('第一行第三行')
  })
})
