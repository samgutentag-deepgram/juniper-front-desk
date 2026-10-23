import { describe, expect, it } from 'vitest'
import { agentSettings, listenSettings, sessionConfig, speakSettings } from '../src/lib/agent-config'
import { KEYTERMS, makeConfirmationCode } from '../src/lib/clinic'

const opts = { confirmationCode: 'JV-7Q3K', voice: 'flux-haley-en' as const, tone: 0, keyterms: false }

describe('agent settings', () => {
  const s = agentSettings(opts) as Record<string, any>

  it('listens with Flux on v2', () => {
    expect(s.listen.provider).toMatchObject({ type: 'deepgram', version: 'v2', model: 'flux-general-en' })
  })

  it('speaks with a Flux TTS voice on v2', () => {
    expect(s.speak.provider).toMatchObject({ type: 'deepgram', version: 'v2', model: 'flux-haley-en', expressivity: 0 })
  })

  it('thinks on a Deepgram-hosted LLM, so no LLM key or endpoint is needed', () => {
    expect(s.think.provider.type).toBe('anthropic')
    expect(s.think.endpoint).toBeUndefined()
  })

  it('puts this call’s booking reference in the prompt', () => {
    expect(s.think.prompt).toContain('JV-7Q3K')
  })

  it('opens with the clinic greeting', () => {
    expect(s.greeting).toMatch(/Juniper Veterinary Clinic/)
  })
})

describe('live updates', () => {
  it('keyterms on sends the staff list, off clears it', () => {
    expect(listenSettings(true).provider.keyterms).toEqual(KEYTERMS)
    expect(listenSettings(false).provider.keyterms).toEqual([])
  })

  it('a voice swap keeps Flux TTS on v2', () => {
    expect(speakSettings('flux-kit-en', 2).provider).toMatchObject({ version: 'v2', model: 'flux-kit-en', expressivity: 2 })
  })
})

describe('auth', () => {
  it('uses the visitor key directly and only in auth', () => {
    const cfg = sessionConfig('visitor-key', opts)
    expect(cfg.auth).toEqual({ apiKey: 'visitor-key' })
    expect(JSON.stringify(cfg.agent)).not.toContain('visitor-key')
  })
})

describe('booking reference', () => {
  it('is JV- and four unambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(makeConfirmationCode()).toMatch(/^JV-[A-HJ-NP-Z2-9]{4}$/)
  })
})
