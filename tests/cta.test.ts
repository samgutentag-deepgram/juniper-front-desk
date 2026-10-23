import { describe, expect, it } from 'vitest'
import { SIGNUP_BASE, SIGNUP_UTM, signupUrl } from '../src/lib/cta'

describe('signup links', () => {
  it('go to console signup with this page as the source', () => {
    const url = new URL(signupUrl('cta-band'))
    expect(`${url.origin}${url.pathname}`).toBe(SIGNUP_BASE)
    for (const [k, v] of Object.entries(SIGNUP_UTM)) expect(url.searchParams.get(k)).toBe(v)
  })

  it('tell the two placements apart', () => {
    expect(new URL(signupUrl('cta-band')).searchParams.get('utm_content')).toBe('cta-band')
    expect(new URL(signupUrl('key-entry')).searchParams.get('utm_content')).toBe('key-entry')
  })

  it('never claims the click came from email', () => {
    expect(signupUrl('cta-band')).not.toContain('utm_medium=email')
  })
})
