import { describe, expect, it } from 'vitest'
import { agentSettings } from '../src/lib/agent-config'
import { captionsConfigure, captionsUrl } from '../src/lib/captions'
import { KEYTERMS } from '../src/lib/clinic'
import { CHAPTERS, historyBefore } from '../src/lib/guide'
import { ALL_OFF, DUMB_EOT, SMART_EOT } from '../src/lib/toggles'

const turnEnd = CHAPTERS.findIndex((c) => c.id === 'smartEot')
const opts = { confirmationCode: 'JV-AAAA', voice: 'flux-haley-en' as const, tone: 0, toggles: ALL_OFF }

describe('jumping to a chapter', () => {
  it('has no earlier conversation at the start', () => {
    expect(historyBefore(0)).toEqual([])
  })

  it('brings every earlier line, so the agent already knows the dog', () => {
    const h = historyBefore(turnEnd)
    expect(h.length % 2).toBe(0)
    expect(h.some((m) => m.role === 'user' && m.content.includes('Otto'))).toBe(true)
    expect(h.at(-1)?.content).toContain('Gutentag is seeing new patients')
  })

  it('uses the fixed take of earlier switches, and the live call’s own reference', () => {
    const h = historyBefore(CHAPTERS.length - 1, 'JV-ZZZZ')
    expect(h.map((m) => m.content).join(' ')).not.toContain("I don't see a Doctor")
    expect(h.map((m) => m.content).join(' ')).toContain('JV-ZZZZ')
  })

  it('sends history as context and skips the greeting', () => {
    const s = agentSettings(opts, historyBefore(turnEnd)) as Record<string, any>
    expect(s.greeting).toBeUndefined()
    expect(s.context.messages[0]).toMatchObject({ type: 'History', role: 'user' })
    expect((agentSettings(opts) as Record<string, any>).greeting).toBeTruthy()
  })
})

describe('live captions stream', () => {
  it('listens with Flux and the switches’ end of turn and keyterms', () => {
    const off = new URL(captionsUrl(ALL_OFF))
    expect(off.searchParams.get('model')).toBe('flux-general-en')
    expect(off.searchParams.get('eot_timeout_ms')).toBe(String(DUMB_EOT.eot_timeout_ms))
    expect(off.searchParams.getAll('keyterm')).toEqual([])
    const on = new URL(captionsUrl({ ...ALL_OFF, keyterms: true, smartEot: true }))
    expect(on.searchParams.get('eot_threshold')).toBe(String(SMART_EOT.eot_threshold))
    expect(on.searchParams.getAll('keyterm')).toEqual(KEYTERMS)
  })

  it('updates mid-stream with the whole keyterm list', () => {
    expect(captionsConfigure({ ...ALL_OFF, keyterms: true })).toMatchObject({ type: 'Configure', keyterms: KEYTERMS, thresholds: DUMB_EOT })
  })
})
