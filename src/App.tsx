import { useMemo, useRef, useState } from 'react'
import { AgentProvider } from '@deepgram/react'
import { sessionConfig, type VoiceId } from './lib/agent-config'
import { makeConfirmationCode } from './lib/clinic'
import { SCRIPT } from './lib/script'
import { ALL_OFF, TOGGLE_ORDER, type ToggleName, type Toggles } from './lib/toggles'
import { ToggleCard } from './components/ToggleCard'
import { SwitchBar } from './components/SwitchBar'
import { Guide } from './components/guide/Guide'
import { CHAPTERS, currentLine, guide, phaseFor, runLabel, START, type GuideEvent, type GuideState } from './lib/guide'
import { VoiceCard } from './components/VoiceCard'
import { KeyEntry } from './components/KeyEntry'
import { CreditCta } from './components/CreditCta'
import { DemoCall } from './components/demo/DemoCall'
import { useDemo } from './components/demo/useDemo'
import { LiveCall } from './components/live/LiveCall'

type Mode = 'demo' | 'live'

export function App() {
  const [mode, setMode] = useState<Mode>('demo')
  const [toggles, setToggles] = useState<Toggles>(ALL_OFF)
  const [voice, setVoice] = useState<VoiceId>('flux-haley-en')
  const [tone, setTone] = useState(0)
  // The key lives in memory only. A reload forgets it, on purpose.
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [callId, setCallId] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [walk, setWalk] = useState<GuideState>(START)
  const togglesRef = useRef(toggles)
  togglesRef.current = toggles
  const send = (event: GuideEvent, t: Toggles = togglesRef.current) => setWalk((s) => guide(s, event, t))

  const setToggle = (name: ToggleName, on: boolean) => {
    const t = { ...togglesRef.current, [name]: on }
    togglesRef.current = t
    setToggles(t)
    send({ type: 'toggled', name, on }, t)
  }
  // Each chapter starts with its own switch off, so the first run is always the before.
  const gotoChapter = (i: number) => {
    const c = CHAPTERS[i]
    if (!c) return
    const t = c.toggle ? { ...togglesRef.current, [c.toggle]: false } : togglesRef.current
    togglesRef.current = t
    setToggles(t)
    send({ type: 'goto', chapter: i }, t)
  }

  const demo = useDemo(toggles, voice, tone, (id) => send({ type: 'said', stepId: id }))
  const chapter = CHAPTERS[walk.chapter]!
  const sayDemo = (id: string) => demo.say(id, runLabel({ ...walk, phase: phaseFor(chapter, toggles) }))

  // Live calls: match what the caller said against this chapter's lines, the current one first.
  const onUserLine = (text: string) => {
    const lower = text.toLowerCase()
    setWalk((s) => {
      const ch = CHAPTERS[s.chapter]!
      const now = currentLine(s)
      const id = [...(now ? [now] : []), ...ch.lines].find((sid) => SCRIPT.find((x) => x.id === sid)!.match.some((m) => lower.includes(m)))
      return id ? guide(s, { type: 'said', stepId: id }, togglesRef.current) : s
    })
  }

  const switchMode = (m: Mode) => {
    if (m === mode) return
    demo.reset()
    togglesRef.current = ALL_OFF
    setToggles(ALL_OFF)
    setWalk(START)
    setMode(m)
  }

  // A new provider per call id. Tone is fixed for a session, so changing it mid-call starts a new
  // one; the switches and the voice change on the open call and never touch this.
  const code = useMemo(() => makeConfirmationCode(), [callId])
  const config = useMemo(
    () => (apiKey ? sessionConfig(apiKey, { toggles, voice, tone, confirmationCode: code }) : null),
    [apiKey, callId], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const guideEl = (
    <Guide state={walk} toggles={toggles} live={mode === 'live'} onSay={mode === 'demo' ? sayDemo : undefined}
      agentTalking={demo.agentTalking} callerTalking={demo.callerTalking}
      onToggle={setToggle} onGoto={gotoChapter} onSkip={() => send({ type: 'skip' })} />
  )
  const changeTone = (t: number) => {
    setTone(t)
    if (mode === 'live' && apiKey) setCallId((n) => n + 1)
  }

  const rail = (
    <aside className="rail" aria-label="Switches">
      {TOGGLE_ORDER.map((name) => (
        <ToggleCard key={name} name={name} on={toggles[name]} current={chapter.toggle === name}
          flip={chapter.toggle === name && walk.phase === 'flip'} onChange={(on) => setToggle(name, on)} />
      ))}
      <VoiceCard voice={voice} tone={tone} live={mode === 'live'} current={chapter.id === 'booking'} onVoice={setVoice} onTone={changeTone} />
    </aside>
  )

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <p className="eyebrow">Deepgram Voice Agent API · Flux · Flux TTS</p>
          <h1>Call the Juniper Veterinary Clinic front desk</h1>
          <p className="lede">
            You just adopted a dog and need a vet. Say your lines. Every switch starts off: hear it fail, flip it, say the line again.
          </p>
        </div>
        <div className="tabs" role="tablist" aria-label="How to call">
          <button type="button" role="tab" aria-selected={mode === 'demo'} className={mode === 'demo' ? 'tab on' : 'tab'}
            onClick={() => switchMode('demo')}>Replay, no key</button>
          <button type="button" role="tab" aria-selected={mode === 'live'} className={mode === 'live' ? 'tab on' : 'tab'}
            onClick={() => switchMode('live')}>Live, your mic</button>
        </div>
      </header>

      <SwitchBar toggles={toggles} current={chapter.toggle} onChange={setToggle} />

      <main className="layout">
        <section className="panel" aria-label="The call">
          {mode === 'demo' && (
            <>
              <p className="muted small demo-note">
                Replay: recorded Flux TTS audio and real Flux transcripts, clearest takes kept. Your voice may differ: try the Live tab.
              </p>
              {guideEl}
              <DemoCall demo={demo} />
            </>
          )}
          {mode === 'live' && (!apiKey || !config ? (
            <KeyEntry onKey={(k) => { setError(null); setApiKey(k) }} />
          ) : (
            <AgentProvider key={callId} config={config} autoStart={callId > 0}
              onSdkError={(e) => setError(e.message)}
              onError={(e) => setError(e.description ?? 'The agent reported an error.')}>
              {guideEl}
              <LiveCall code={code} toggles={toggles} voice={voice} tone={tone} error={error} onError={setError}
                onClearError={() => setError(null)} onForgetKey={() => { setApiKey(null); setError(null) }}
                onUserLine={onUserLine} />
            </AgentProvider>
          ))}
        </section>
        {rail}
      </main>

      <CreditCta />

    </div>
  )
}
