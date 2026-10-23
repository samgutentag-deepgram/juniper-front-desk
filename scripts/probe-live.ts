// Probe the two live-tab features against Deepgram: an agent started from a later chapter with the
// earlier lines as context, and the captions stream's word-by-word updates.
import { AgentSession } from '@deepgram/agents'
import { agentSettings } from '../src/lib/agent-config'
import { captionsUrl } from '../src/lib/captions'
import { CHAPTERS, historyBefore } from '../src/lib/guide'
import { ALL_OFF } from '../src/lib/toggles'

const key = process.env.DEEPGRAM_API_KEY!
const chapter = CHAPTERS.findIndex((c) => c.id === 'smartEot')

// 1. Seeded agent: does it pick up mid-call instead of asking the dog's name?
const s = new AgentSession({
  auth: { apiKey: key },
  agent: agentSettings({ confirmationCode: 'JV-PRBE', voice: 'flux-haley-en', tone: 0, toggles: { ...ALL_OFF, smartEot: true } }, historyBefore(chapter, 'JV-PRBE')),
  reconnect: { enabled: false },
})
const replies: string[] = []
let greeted = false
s.on('conversation-text', (m) => { if (m.role === 'assistant') replies.push(m.content) })
s.on('error', (m) => console.log('agent error', JSON.stringify(m)))
const applied = new Promise((r) => s.once('settings-applied', r))
await s.connect(); await applied
await new Promise((r) => setTimeout(r, 2500)); greeted = replies.length > 0
s.injectUserMessage("So I work from home most days, but on Tuesdays and Thursdays I'm in the office. What do you have later in the week?")
await new Promise((r) => setTimeout(r, 9000))
s.disconnect()
console.log('greeted on connect:', greeted)
console.log('reply:', replies.join(' '))
console.log('asked the name again:', /what'?s his name/i.test(replies.join(' ')))

// 2. Captions: stream a synthesized line in real time and count word-by-word updates.
const pcm: Buffer = await new Promise((resolve) => {
  const ws = new WebSocket('wss://api.deepgram.com/v2/speak?model=flux-cole-en&encoding=linear16&sample_rate=16000', ['token', key])
  ws.binaryType = 'arraybuffer'; const c: Buffer[] = []
  ws.onopen = () => { ws.send(JSON.stringify({ type: 'Speak', text: 'Can he see Doctor Gutentag on Friday afternoon?' })); ws.send(JSON.stringify({ type: 'Flush' })) }
  ws.onmessage = (e) => { if (typeof e.data !== 'string') c.push(Buffer.from(e.data as ArrayBuffer)); else if (JSON.parse(e.data).type === 'SpeechMetadata') setTimeout(() => ws.close(), 300) }
  ws.onclose = () => resolve(Buffer.concat(c)); ws.onerror = () => {}
})
const updates: string[] = []
await new Promise<void>((resolve) => {
  const ws = new WebSocket(captionsUrl({ ...ALL_OFF, keyterms: true, smartEot: true }), ['token', key])
  ws.onopen = async () => {
    const a = Buffer.concat([pcm, Buffer.alloc(16000 * 2 * 3)])
    for (let i = 0; i < a.length; i += 640) { ws.send(a.subarray(i, i + 640)); await new Promise((r) => setTimeout(r, 20)) }
    ws.send(JSON.stringify({ type: 'CloseStream' }))
  }
  ws.onmessage = (e) => { if (typeof e.data === 'string') { const m = JSON.parse(e.data); if (m.type === 'TurnInfo') updates.push(`${m.event}: ${m.transcript}`) } }
  ws.onclose = () => resolve(); ws.onerror = () => {}
})
const distinct = [...new Set(updates.filter((u) => u.startsWith('Update')).map((u) => u.slice(8)))]
console.log('caption updates:', updates.length, '| distinct partials:', distinct.length)
for (const d of distinct.slice(0, 8)) console.log('  ', d)
console.log('  final:', updates.filter((u) => u.startsWith('EndOfTurn')).join(' | '))
process.exit(0)
