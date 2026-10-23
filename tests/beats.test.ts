import { describe, expect, it } from 'vitest'
import { nameHeard, saidCode, splitOnCode } from '../src/lib/beats'

describe('nameHeard', () => {
  it('flags the split surname as a miss', () => {
    expect(nameHeard('Can he see Dr. Guten Tag?')).toEqual({ text: 'Guten Tag', exact: false })
  })
  it('catches the other ways Flux writes it without keyterms', () => {
    for (const t of ['Guttentag', 'Gooten tag', 'Good and Tag', 'Gutentagg', 'Gunnontag']) expect(nameHeard(`see Dr. ${t}`)?.exact).toBe(false)
  })
  it('flags the joined surname as exact', () => {
    expect(nameHeard('Can he see Doctor Gutentag?')).toEqual({ text: 'Gutentag', exact: true })
  })
  it('handles "Doctor." with a period, and ignores the other vets', () => {
    expect(nameHeard('Can he see Doctor. Gutentag?')?.exact).toBe(true)
    expect(nameHeard('Can he see Doctor Okafor?')).toBeNull()
  })
  it('ignores lines without the name', () => {
    expect(nameHeard('What happens at his first wellness exam?')).toBeNull()
  })
})

describe('booking reference', () => {
  it('finds and splits the code in an agent line', () => {
    const line = 'Your booking reference is JV-7Q3K. The front desk will text you.'
    expect(saidCode(line, 'JV-7Q3K')).toBe(true)
    expect(splitOnCode(line, 'JV-7Q3K')).toEqual(['Your booking reference is ', 'JV-7Q3K', '. The front desk will text you.'])
  })
})

import { friendlyError } from '../src/lib/errors'

describe('friendlyError', () => {
  it('blames the key when the socket closes before the call starts', () => {
    expect(friendlyError('socket closed: 1000', false)).toMatch(/key/)
  })
  it('reports a mid-call drop as a drop', () => {
    expect(friendlyError('socket closed: 1006', true)).toMatch(/^The call dropped/)
  })
})
