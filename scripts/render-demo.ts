// Renders the no-key demo: every caller line and agent reply in the script, voiced with Flux TTS,
// and every caller line run through Flux STT so the demo transcript shows what Flux really heard.
// The name beat is transcribed twice, keyterms off and on, so its failure and fix are real output.
//
//   DEEPGRAM_API_KEY=... pnpm exec tsx scripts/render-demo.ts
//
// Writes public/demo/*.mp3 and src/lib/demo-manifest.json. Needs ffmpeg on the path, at render
// time only; the page ships the mp3s.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { KEYTERMS } from '../src/lib/clinic'
import { SCRIPT, spoken } from '../src/lib/script'
import { DUMB_EOT, SMART_EOT } from '../src/lib/toggles'
import { nameHeard } from '../src/lib/beats'
import { TONES, VOICES } from '../src/lib/agent-config'

const key = process.env.DEEPGRAM_API_KEY
if (!key) throw new Error('set DEEPGRAM_API_KEY')

const AGENT_VOICE = 'flux-haley-en'
// Tried in order until one gives the name beat a visible miss with keyterms off and a hit with them on.
const CALLER_VOICES = (process.env.CALLER_VOICES ?? 'flux-kit-en,flux-cole-en,flux-drew-en,flux-wade-en').split(',')
const STT_RATE = 16_000
const OUT = 'public/demo'
mkdirSync(OUT, { recursive: true })

function synth(text: string, voice: string, rate: number, expressivity = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const q = new URLSearchParams({ model: voice, encoding: 'linear16', sample_rate: String(rate) })
    if (expressivity) q.set('expressivity', String(expressivity))
    const ws = new WebSocket(`wss://api.deepgram.com/v2/speak?${q}`, ['token', key!])
    ws.binaryType = 'arraybuffer'
    const chunks: Buffer[] = []
    ws.onopen = () => { ws.send(JSON.stringify({ type: 'Speak', text })); ws.send(JSON.stringify({ type: 'Flush' })) }
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') { chunks.push(Buffer.from(e.data as ArrayBuffer)); return }
      const m = JSON.parse(e.data)
      // Audio can trail the Flushed marker, so close once SpeechMetadata says it is done.
      if (m.type === 'SpeechMetadata') setTimeout(() => ws.close(), 300)
      if (m.type === 'Error') reject(new Error(`${voice}: ${m.description}`))
    }
    ws.onclose = () => (chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error(`${voice}: no audio for "${text}"`)))
    ws.onerror = () => {}
  })
}

function transcribe(pcm: Buffer, keyterms: string[], eot: Record<string, number> = SMART_EOT): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const u = new URL('wss://api.deepgram.com/v2/listen')
    u.searchParams.set('model', 'flux-general-en')
    u.searchParams.set('encoding', 'linear16')
    u.searchParams.set('sample_rate', String(STT_RATE))
    for (const [k, v] of Object.entries(eot)) u.searchParams.set(k, String(v))
    for (const k of keyterms) u.searchParams.append('keyterm', k)
    const ws = new WebSocket(u, ['token', key!])
    const finals: string[] = []
    ws.onopen = async () => {
      // Real time, 20 ms frames, so pauses land the way they would on a call. Trailing silence closes the turn.
      const audio = Buffer.concat([pcm, Buffer.alloc(STT_RATE * 2 * 6)])
      for (let i = 0; i < audio.length; i += 640) { ws.send(audio.subarray(i, i + 640)); await new Promise((r) => setTimeout(r, 20)) }
      ws.send(JSON.stringify({ type: 'CloseStream' }))
    }
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return
      const m = JSON.parse(e.data)
      if (m.type === 'TurnInfo' && m.event === 'EndOfTurn' && m.transcript) finals.push(m.transcript)
      if (m.type === 'Error') reject(new Error(m.description))
    }
    ws.onclose = () => resolve(finals)
    ws.onerror = () => {}
  })
}

function mp3(pcm: Buffer, rate: number, file: string): number {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0', '-b:a', '48k', `${OUT}/${file}`], { input: pcm })
  return Math.round((pcm.length / 2 / rate) * 1000)
}

// ONLY=ramble,bye re-renders just those steps into the existing manifest.
const only = process.env.ONLY?.split(',')
const previous = only ? JSON.parse(readFileSync('src/lib/demo-manifest.json', 'utf8')) : null

// 1. Pick a caller voice that makes the name beat honest: a miss without keyterms, a hit with them.
const nameLine = spoken(SCRIPT.find((s) => s.id === 'name')!)
let callerVoice: string = previous?.callerVoice ?? ''
for (const v of previous ? [] : CALLER_VOICES) {
  const pcm = await synth(nameLine, v, STT_RATE)
  const off = (await transcribe(pcm, [])).join(' ')
  const on = (await transcribe(pcm, KEYTERMS)).join(' ')
  console.log(`${v.padEnd(14)} off: ${off}  |  on: ${on}`)
  const offHeard = nameHeard(off)
  if (offHeard && !offHeard.exact && nameHeard(on)?.exact) { callerVoice = v; break }
}
if (!callerVoice) throw new Error('no caller voice gave a miss with keyterms off and a hit with them on; try CALLER_VOICES=...')
console.log(`caller voice: ${callerVoice}`)

// 2. Every step: caller audio, what Flux heard with the switch off and on, and both replies.
type Take = { heard: string[]; text: string; url: string; ms: number }
const steps: Record<string, { caller: string; callerMs: number; firstPart?: string; firstPartMs?: number; off: Take; on: Take }> = previous?.steps ?? {}
const PAUSE_MS = 2200
for (const step of SCRIPT) {
  if (only && !only.includes(step.id)) continue
  const parts = step.say.split(' | ')
  let pcms: Buffer[] = []
  let pcm: Buffer = Buffer.alloc(0)
  let heardOff: string[] = []
  let heardOn: string[] = []
  // TTS takes vary. For the end-of-turn step, keep the first take that shows what the switch does
  // on a real caller: the silence timer splits the sentence at the pause, Flux waits it out.
  for (let attempt = 1; attempt <= 6; attempt++) {
    pcms = await Promise.all(parts.map((p) => synth(p, callerVoice, STT_RATE)))
    pcm = pcms.length === 1 ? pcms[0]! : Buffer.concat([pcms[0]!, Buffer.alloc((STT_RATE / 1000) * 2 * PAUSE_MS), pcms[1]!])
    const heardFor = async (on: boolean) => transcribe(
      pcm,
      step.toggle === 'keyterms' && on ? KEYTERMS : [],
      step.toggle === 'smartEot' && !on ? DUMB_EOT : SMART_EOT,
    )
    heardOff = await heardFor(false)
    heardOn = step.toggle === 'keyterms' || step.toggle === 'smartEot' ? await heardFor(true) : heardOff
    if (step.toggle !== 'smartEot' || (heardOff.length > 1 && heardOn.length === 1)) break
    console.log(`${step.id} take ${attempt} did not show the switch, off: ${JSON.stringify(heardOff)} on: ${JSON.stringify(heardOn)}`)
    if (attempt === 6) throw new Error('no end-of-turn take showed the switch')
  }
  const takes = {} as { off: Take; on: Take }
  for (const pos of ['off', 'on'] as const) {
    const heard = pos === 'off' ? heardOff : heardOn
    const template = typeof step.agent === 'string' ? step.agent : step.agent[pos]
    const text = template.replace('{heard}', nameHeard(heard.join(' '))?.text ?? 'Gutentag')
    const sameAsOff = pos === 'on' && typeof step.agent === 'string'
    const file = typeof step.agent === 'string' ? `${step.id}-agent.mp3` : `${step.id}-agent-${pos}.mp3`
    takes[pos] = sameAsOff ? { ...takes.off, heard } : { heard, text, url: `demo/${file}`, ms: mp3(await synth(text, AGENT_VOICE, 24_000), 24_000, file) }
  }
  steps[step.id] = {
    caller: `demo/${step.id}-caller.mp3`,
    callerMs: mp3(pcm, STT_RATE, `${step.id}-caller.mp3`),
    ...(pcms.length > 1 ? { firstPart: `demo/${step.id}-caller-1.mp3`, firstPartMs: mp3(pcms[0]!, STT_RATE, `${step.id}-caller-1.mp3`) } : {}),
    ...takes,
  }
  console.log(`${step.id.padEnd(8)} off: ${JSON.stringify(heardOff)}${heardOn !== heardOff ? `  on: ${JSON.stringify(heardOn)}` : ''}`)
}

// 3. The voice beat: the same reply in each voice and tone.
const again = SCRIPT.find((s) => s.id === 'again')!.agent as string
const variants: Record<string, string> = previous?.variants ?? {}
for (const v of only ? [] : VOICES.filter((v) => v.id !== 'flux-marcus-en')) {
  for (const t of TONES) {
    const file = `again-${v.id}-${t.value}.mp3`
    mp3(await synth(again, v.id, 24_000, t.value), 24_000, file)
    variants[`${v.id}:${t.value}`] = `demo/${file}`
  }
}

writeFileSync('src/lib/demo-manifest.json', JSON.stringify({ callerVoice, agentVoice: AGENT_VOICE, rendered: new Date().toISOString().slice(0, 10), steps, variants }, null, 2) + '\n')
console.log('wrote src/lib/demo-manifest.json')
