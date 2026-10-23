// Live captions. The Voice Agent API only reports what the caller said once the turn is over, so
// on a live call a second, listen-only Flux stream runs beside it on the visitor's own key, fed the
// same mic audio, and its Update events fill in the caller's bubble as they talk. It uses the same
// keyterms and end-of-turn settings as the switches, so the turn ends on screen when it ends for
// the agent. This costs a second stream of speech-to-text minutes on the visitor's key.

import { KEYTERMS } from './clinic'
import { LISTEN_MODEL } from './agent-config'
import { DUMB_EOT, SMART_EOT, type Toggles } from './toggles'

export const CAPTIONS_SAMPLE_RATE = 16_000

export function eotFor(toggles: Toggles) {
  return toggles.smartEot ? SMART_EOT : DUMB_EOT
}

export function captionsUrl(toggles: Toggles): string {
  const url = new URL('wss://api.deepgram.com/v2/listen')
  url.searchParams.set('model', LISTEN_MODEL)
  url.searchParams.set('encoding', 'linear16')
  url.searchParams.set('sample_rate', String(CAPTIONS_SAMPLE_RATE))
  for (const [k, v] of Object.entries(eotFor(toggles))) url.searchParams.set(k, String(v))
  if (toggles.keyterms) for (const term of KEYTERMS) url.searchParams.append('keyterm', term)
  return url.toString()
}

/** The mid-stream update for when a switch flips. Flux replaces the keyterm list, so send it whole. */
export function captionsConfigure(toggles: Toggles) {
  return {
    type: 'Configure',
    keyterms: toggles.keyterms ? [...KEYTERMS] : [],
    thresholds: eotFor(toggles),
  }
}
