// The one file a reader forks. Every session setting lives here.
// Import types from @deepgram/agents, not @deepgram/react: the react package's type re-exports
// point at a monorepo path that is not in the published tarball.
import type { AgentSessionConfig, AgentSettingsObject } from '@deepgram/agents'
import { GREETING, KEYTERMS, systemPrompt } from './clinic'
import { DUMB_EOT, SMART_EOT, type Toggles } from './toggles'

export const LISTEN_MODEL = 'flux-general-en'

// Deepgram hosts this LLM, so the visitor needs no Anthropic key. Standard tier, and the clinic
// prompt was tuned on Claude in the talk demo.
export const THINK = { type: 'anthropic', model: 'claude-haiku-4-5' } as const

export const VOICES = [
  { id: 'flux-haley-en', label: 'Haley' },
  { id: 'flux-kit-en', label: 'Kit' },
  { id: 'flux-alexis-en', label: 'Alexis' },
  { id: 'flux-marcus-en', label: 'Marcus' },
] as const

export type VoiceId = (typeof VOICES)[number]['id']

/** Flux TTS expressivity, calm to animated. Fixed for a session, so changing it restarts the call. */
export const TONES = [
  { value: -2, label: 'Calm' },
  { value: 0, label: 'Default' },
  { value: 2, label: 'Animated' },
] as const

export interface CallOptions {
  confirmationCode: string
  voice: VoiceId
  tone: number
  toggles: Toggles
}

/** The whole listen block. UpdateListen replaces it, so every switch is sent every time. */
export function listenSettings(toggles: Toggles) {
  return {
    provider: {
      type: 'deepgram' as const,
      version: 'v2' as const,
      model: LISTEN_MODEL,
      // An empty list clears keyterms on Flux, which is what "off" means mid-call.
      keyterms: toggles.keyterms ? [...KEYTERMS] : [],
      ...(toggles.smartEot ? SMART_EOT : DUMB_EOT),
    },
  }
}

export function speakSettings(voice: VoiceId, tone: number) {
  return { provider: { type: 'deepgram' as const, version: 'v2', model: voice, expressivity: tone } }
}

export interface HistoryMessage { role: 'user' | 'assistant'; content: string }

/** `history` is the call so far when a visitor jumps to a later chapter. The agent picks up from
 *  it instead of greeting again. */
export function agentSettings(opts: CallOptions, history: HistoryMessage[] = []): AgentSettingsObject {
  return {
    listen: listenSettings(opts.toggles),
    think: { provider: { ...THINK }, prompt: systemPrompt(opts.confirmationCode) },
    speak: speakSettings(opts.voice, opts.tone),
    ...(history.length
      ? { context: { messages: history.map((m) => ({ type: 'History' as const, ...m })) } }
      : { greeting: GREETING }),
  } as AgentSettingsObject
}

export function sessionConfig(apiKey: string, opts: CallOptions, history: HistoryMessage[] = []): AgentSessionConfig {
  return {
    // The visitor's own key, straight from their browser to Deepgram as a websocket subprotocol.
    // Not the template's server-minted token: that grant needs a key role many visitor keys lack
    // (403 "Insufficient permissions"), and this way the key never touches our server.
    auth: { apiKey },
    agent: agentSettings(opts, history),
    audio: {
      input: { encoding: 'linear16', sampleRate: 16_000 },
      output: { encoding: 'linear16', sampleRate: 24_000 },
    },
    tags: ['juniper-front-desk'],
    // A bad key fails the same way every time, so do not spend 30 seconds retrying it.
    reconnect: { maxAttempts: 2 },
  }
}
