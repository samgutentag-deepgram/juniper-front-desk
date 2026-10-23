// End-to-end smoke test with no microphone: synthesize a caller with Flux TTS, stream it into the
// agent through the real token route, and check each walkthrough beat on the wire.
//
//   DEEPGRAM_API_KEY=... pnpm exec tsx scripts/smoke.ts
import { AgentSession } from '@deepgram/agents'
import { agentSettings, listenSettings, speakSettings } from '../src/lib/agent-config'
import { makeConfirmationCode } from '../src/lib/clinic'
import { ALL_OFF } from '../src/lib/toggles'
import { nameHeard, saidCode } from '../src/lib/beats'

const key = process.env.DEEPGRAM_API_KEY
if (!key) throw new Error('set DEEPGRAM_API_KEY')

const RATE = 16_000
const FRAME = (RATE / 50) * 2 // 20 ms of linear16

async function synth(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://api.deepgram.com/v2/speak?model=flux-marcus-en&encoding=linear16&sample_rate=${RATE}`, ['token', key!])
    ws.binaryType = 'arraybuffer'
    const chunks: Buffer[] = []
    ws.onopen = () => { ws.send(JSON.stringify({ type: 'Speak', text })); ws.send(JSON.stringify({ type: 'Flush' })) }
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') { chunks.push(Buffer.from(e.data as ArrayBuffer)); return }
      const m = JSON.parse(e.data)
      // Audio can trail the Flushed marker, so close once SpeechMetadata says how long it is.
      if (m.type === 'SpeechMetadata') setTimeout(() => ws.close(), 300)
      if (m.type === 'Error') reject(new Error(m.description))
    }
    ws.onclose = () => resolve(Buffer.concat(chunks))
    ws.onerror = () => { if (!chunks.length) reject(new Error('speak socket error')) }
  })
}

const code = makeConfirmationCode()
const session = new AgentSession({
  auth: { apiKey: key },
  agent: agentSettings({ confirmationCode: code, voice: 'flux-haley-en', tone: 0, toggles: { ...ALL_OFF, smartEot: true } }),
  audio: { input: { encoding: 'linear16', sampleRate: RATE }, output: { encoding: 'linear16', sampleRate: 24_000 } },
  reconnect: { enabled: false },
})

// A continuous mic: queued speech, else silence, one frame every 20 ms.
let pending = Buffer.alloc(0)
let speaking = false
let audioBytes = 0
const results: [string, boolean, string][] = []
const lines: { role: string; content: string }[] = []
const ok = (name: string, pass: boolean, detail = '') => { results.push([name, pass, detail]); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

session.on('conversation-text', (m) => { lines.push(m); console.log(`  ${m.role === 'user' ? 'caller' : 'agent '}: ${m.content}`) })
// The server does not always send AgentStartedSpeaking, so "speaking" means agent audio arriving
// now. The React provider infers it from audio the same way.
session.on('agent-audio-done', () => { speaking = false })
session.on('audio', (b) => { audioBytes += b.byteLength; speaking = true })
session.on('error', (m) => console.log('  agent error:', JSON.stringify(m)))
for (const ev of ['sdk-error', 'disconnected', 'user-started-speaking', 'agent-audio-done']) session.on(ev as never, ((m: unknown) => console.log('  [' + ev + ']', m instanceof Error ? m.message : JSON.stringify(m ?? ''))) as never)
session.on('warning', (m) => console.log('  agent warning:', JSON.stringify(m)))

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
function once<T = unknown>(event: string, timeoutMs = 20_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs)
    session.once(event as never, ((m: T) => { clearTimeout(t); resolve(m) }) as never)
  })
}
async function say(text: string) { const pcm = await synth(text); console.log(`  (caller audio ${pcm.length} bytes)`); pending = Buffer.concat([pending, pcm]) }
async function turn(text: string) {
  const done = once('agent-audio-done', 60_000)
  await say(text)
  await done
  await wait(3_000) // let audio "play out" before the next line
}

const applied = once('settings-applied')
await session.connect()
await applied
ok('Settings applied: Flux listen, Flux TTS speak, hosted LLM', true)
const pump = setInterval(() => {
  const frame = pending.length ? pending.subarray(0, FRAME) : Buffer.alloc(FRAME)
  pending = pending.subarray(frame.length)
  session.sendAudio(frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength) as ArrayBuffer)
}, 20)

try {
  await once('agent-audio-done', 30_000) // greeting
  ok('greeting spoken with audio', audioBytes > 0, `${audioBytes} bytes`)
  await turn('Hi, I just adopted a dog, and he needs a vet. His name is Otto.')

  // Beat 1: barge-in. Ask an open question, cut in 2 seconds into the answer.
  const started = once('audio', 30_000)
  await say('What happens at his first wellness exam?')
  await started
  await wait(2_000)
  const cutIn = once('user-started-speaking', 15_000)
  const wasSpeaking = speaking
  await say('Sorry, actually, how much is the new patient bundle?')
  await cutIn
  ok('barge-in: caller starts a turn while the agent is speaking', wasSpeaking)
  await once('agent-audio-done', 60_000).catch(() => {}); await wait(3_000)

  // Beat 2: keyterms off, then on mid-call.
  await turn('Can he see Doctor Gutentag?')
  const off = [...lines].reverse().find((l) => l.role === 'user' && nameHeard(l.content))
  console.log(`  keyterms off heard: ${off ? nameHeard(off.content)?.text : '(no name match)'}`)
  const listenUpdated = once('listen-updated', 10_000)
  session.updateListen(listenSettings({ ...ALL_OFF, smartEot: true, keyterms: true }) as never)
  await listenUpdated
  ok('UpdateListen with keyterms accepted mid-call (no reconnect)', true)
  await turn('Can he see Doctor Gutentag?')
  const on = [...lines].reverse().find((l) => l.role === 'user' && nameHeard(l.content))
  ok('keyterms on: Flux writes "Gutentag"', !!on && !!nameHeard(on.content)?.exact, on ? nameHeard(on.content)?.text : 'no match')

  // Beat 3: booking reference.
  await turn("Can I bring him in Friday at ten, actually, let's make it one.")
  ok(`booking reference ${code} spoken`, lines.some((l) => l.role === 'assistant' && saidCode(l.content, code)))

  // Beat 4: voice swap live.
  const speakUpdated = once('speak-updated', 10_000)
  session.updateSpeak(speakSettings('flux-kit-en', 0) as never)
  await speakUpdated
  ok('UpdateSpeak to another Flux TTS voice accepted mid-call', true)
  await turn('Thanks, that is all.')
} catch (err) {
  ok('run completed', false, (err as Error).message)
} finally {
  clearInterval(pump)
  session.disconnect()
  const failed = results.filter((r) => !r[1]).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
}
