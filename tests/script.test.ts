import { describe, expect, it } from 'vitest'
import { matchStep, SCRIPT, spoken } from '../src/lib/script'
import { TOGGLE_CARDS, TOGGLE_ORDER } from '../src/lib/toggles'

describe('script', () => {
  it('every switch card points at a step that uses that switch', () => {
    for (const name of TOGGLE_ORDER) {
      const step = SCRIPT.find((s) => s.id === TOGGLE_CARDS[name].stepId)
      expect(step?.toggle).toBe(name)
    }
  })

  it('a step with a before and after has a reply for each', () => {
    for (const s of SCRIPT) if (typeof s.agent !== 'string') expect(s.toggle).toBeDefined()
  })

  it('advances one step at a time from what the caller said', () => {
    expect(matchStep('hi, I just adopted a dog', new Set())).toBe(0)
    expect(matchStep('can he see doctor gutentag', new Set())).toBeNull()
  })

  it('shows the long line without the pause marker', () => {
    expect(spoken(SCRIPT.find((s) => s.id === 'ramble')!)).not.toContain('|')
  })
})
