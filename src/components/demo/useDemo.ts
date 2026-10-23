import { useCallback, useRef, useState } from 'react'
import manifest from '../../lib/demo-manifest.json'
import { SCRIPT } from '../../lib/script'
import { nameHeard } from '../../lib/beats'
import type { Toggles } from '../../lib/toggles'
import type { VoiceId } from '../../lib/agent-config'

// The no-key demo. Every line was voiced with Flux TTS and every caller line run through Flux STT
// ahead of time (scripts/render-demo.ts), once with each switch off and once on. Clicking a line
// plays the take that matches the switches right now, so flipping one and saying the line again is
// a real before and after.

interface Take { heard: string[]; text: string; url: string; ms: number }
interface StepAudio { caller: string; callerMs: number; firstPart?: string; firstPartMs?: number; off: Take; on: Take }
const STEPS = manifest.steps as Record<string, StepAudio>
const VARIANTS = manifest.variants as Record<string, string>

export type ChipKind = 'ok' | 'warn' | 'live'
export interface DemoEntry {
  key: number
  role: 'user' | 'assistant' | 'divider'
  text: string
  chips: { kind: ChipKind; text: string }[]
}

const asset = (url: string) => `${import.meta.env.BASE_URL}${url}`

/** `onSaid` fires when a caller line lands, heard or not, so the walkthrough can move on. */
export function useDemo(toggles: Toggles, voice: VoiceId, tone: number, onSaid: (id: string) => void) {
  const onSaidRef = useRef(onSaid)
  onSaidRef.current = onSaid
  const lastDivider = useRef('')
  const [entries, setEntries] = useState<DemoEntry[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [callerTalking, setCallerTalking] = useState(false)
  const [agentTalking, setAgentTalking] = useState(false)
  const agentAudio = useRef<{ el: HTMLAudioElement; entryKey: number; stop: () => void } | null>(null)
  const callerAudio = useRef<(() => void) | null>(null)
  const seq = useRef(0)
  const run = useRef(0)

  const push = (e: Omit<DemoEntry, 'key'>) => {
    const key = ++seq.current
    setEntries((xs) => [...xs, { ...e, key }])
    return key
  }

  /** Plays a clip, resolving when it ends or is stopped. */
  const play = (url: string, onStart?: (el: HTMLAudioElement, stop: () => void) => void) =>
    new Promise<'ended' | 'stopped'>((resolve) => {
      const el = new Audio(asset(url))
      const stop = () => { el.pause(); resolve('stopped') }
      el.onended = () => resolve('ended')
      el.onerror = () => resolve('ended')
      el.play().then(() => onStart?.(el, stop), () => resolve('ended'))
    })

  /** Says a line. `label` names the run, and starts a divider in the transcript when it changes. */
  const say = useCallback(async (id: string, label?: string) => {
    const step = SCRIPT.find((s) => s.id === id)
    const audio = STEPS[id]
    if (!step || !audio) return
    if (label && label !== lastDivider.current) {
      lastDivider.current = label
      push({ role: 'divider', text: label, chips: [] })
    }
    const on = step.toggle ? toggles[step.toggle] : false
    const take = on ? audio.on : audio.off
    const myRun = run.current

    // Talking over the agent.
    const speaking = agentAudio.current
    if (speaking) {
      if (!toggles.bargeIn) {
        setCallerTalking(true)
        await play(audio.caller)
        setCallerTalking(false)
        push({ role: 'user', text: take.heard.join(' '), chips: [{ kind: 'warn', text: 'Not heard: barge-in is off' }] })
        onSaidRef.current(id)
        return
      }
      const { el, entryKey, stop } = speaking
      const spokenShare = el.duration ? el.currentTime / el.duration : 0.5
      stop()
      agentAudio.current = null
      setAgentTalking(false)
      setEntries((xs) => xs.map((e) => {
        if (e.key !== entryKey) return e
        const words = e.text.split(' ')
        const kept = Math.max(1, Math.round(words.length * spokenShare))
        return { ...e, text: `${words.slice(0, kept).join(' ')}…`, chips: [...e.chips, { kind: 'live', text: 'You cut in here. It stopped and listened.' }] }
      }))
    }

    // The caller's line, and what Flux made of it.
    setCallerTalking(true)
    const splitTurn = step.toggle === 'smartEot' && !on && take.heard.length > 1 && audio.firstPart
    await play(splitTurn ? audio.firstPart! : audio.caller, (_el, stop) => { callerAudio.current = stop })
    callerAudio.current = null
    setCallerTalking(false)
    if (run.current !== myRun) return

    const chips: DemoEntry['chips'] = []
    const name = step.toggle === 'keyterms' ? nameHeard(take.heard.join(' ')) : null
    if (name) chips.push({ kind: name.exact ? 'ok' : 'warn', text: `Flux heard “${name.text}” · keyterms ${on ? 'on' : 'off'}` })
    if (splitTurn) chips.push({ kind: 'warn', text: 'Your turn ended at the pause' })
    if (step.toggle === 'smartEot' && on) chips.push({ kind: 'ok', text: 'Flux waited through the pause' })
    push({ role: 'user', text: splitTurn ? take.heard[0]! : take.heard.join(' '), chips })
    setDone((d) => new Set(d).add(id))
    onSaidRef.current(id)

    // The reply. The voice beat swaps in the take for the chosen voice and tone.
    const replyUrl = (id === 'again' && VARIANTS[`${voice}:${tone}`]) || take.url
    const entryKey = push({ role: 'assistant', text: take.text, chips: [] })
    setAgentTalking(true)
    const result = await play(replyUrl, (el, stop) => { agentAudio.current = { el, entryKey, stop } })
    if (result === 'ended' && agentAudio.current?.entryKey === entryKey) {
      agentAudio.current = null
      setAgentTalking(false)
    }
    if (splitTurn && run.current === myRun) {
      push({ role: 'user', text: take.heard.slice(1).join(' '), chips: [{ kind: 'warn', text: 'The rest of your sentence, after it had already answered' }] })
    }
  }, [toggles, voice, tone])

  /** Silence, now: whatever is playing stops and nothing queued after it plays. The conversation stays. */
  const stop = useCallback(() => {
    run.current++
    callerAudio.current?.()
    callerAudio.current = null
    const speaking = agentAudio.current
    if (speaking) {
      speaking.stop()
      setEntries((xs) => xs.map((e) => e.key === speaking.entryKey ? { ...e, text: `${e.text.split(' ').slice(0, Math.max(1, Math.round(e.text.split(' ').length * (speaking.el.duration ? speaking.el.currentTime / speaking.el.duration : 0.5)))).join(' ')}…`, chips: [...e.chips, { kind: 'warn', text: 'Stopped' }] } : e))
    }
    agentAudio.current = null
    setAgentTalking(false)
    setCallerTalking(false)
  }, [])

  const reset = useCallback(() => {
    run.current++
    callerAudio.current?.()
    callerAudio.current = null
    agentAudio.current?.stop()
    agentAudio.current = null
    setAgentTalking(false)
    setCallerTalking(false)
    setEntries([])
    setDone(new Set())
    lastDivider.current = ''
  }, [])

  const next = SCRIPT.find((s) => !done.has(s.id))?.id ?? null
  return { entries, done, next, say, stop, reset, callerTalking, agentTalking }
}
