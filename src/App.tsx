import { useMemo, useState } from 'react'
import { AgentProvider } from '@deepgram/react'
import { sessionConfig, type VoiceId } from './lib/agent-config'
import { makeConfirmationCode } from './lib/clinic'
import { SCRIPT } from './lib/script'
import { ALL_OFF, TOGGLE_ORDER, type Toggles } from './lib/toggles'
import { HOLD_PLEASE_URL } from './lib/cta'
import { ToggleCard } from './components/ToggleCard'
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
  const [liveNext, setLiveNext] = useState<string | null>(SCRIPT[0]!.id)

  const demo = useDemo(toggles, voice, tone)

  // A new provider per call id. Tone is fixed for a session, so changing it mid-call starts a new
  // one; the switches and the voice change on the open call and never touch this.
  const code = useMemo(() => makeConfirmationCode(), [callId])
  const config = useMemo(
    () => (apiKey ? sessionConfig(apiKey, { toggles, voice, tone, confirmationCode: code }) : null),
    [apiKey, callId], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const next = mode === 'demo' ? demo.next : liveNext
  const nextToggle = SCRIPT.find((s) => s.id === next)?.toggle
  const changeTone = (t: number) => {
    setTone(t)
    if (mode === 'live' && apiKey) setCallId((n) => n + 1)
  }

  const rail = (
    <aside className="rail" aria-label="Switches">
      <p className="rail-intro">Every switch starts off. Say a line, flip its switch, say it again.</p>
      {TOGGLE_ORDER.map((name) => (
        <ToggleCard key={name} name={name} on={toggles[name]} current={nextToggle === name}
          onChange={(on) => setToggles((t) => ({ ...t, [name]: on }))} />
      ))}
      <VoiceCard voice={voice} tone={tone} live={mode === 'live'} current={next === 'again'} onVoice={setVoice} onTone={changeTone} />
      <p className="muted small">
        Want the latency and end-of-turn numbers behind these? <a href={HOLD_PLEASE_URL} target="_blank" rel="noreferrer">Build
        it yourself on raw Flux sockets with hold-please</a>, the open source version from the Vonage Tech Week talk.
      </p>
    </aside>
  )

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Deepgram Voice Agent API · Flux · Flux TTS</p>
        <h1>Call the Juniper Veterinary Clinic front desk</h1>
        <p className="lede">
          You just adopted a dog and need a vet. Say your lines on the left. The switches on the right are three
          things that break voice agents on real callers: hear each one fail, flip it on, and hear the fix.
        </p>
        <div className="tabs" role="tablist" aria-label="How to call">
          <button type="button" role="tab" aria-selected={mode === 'demo'} className={mode === 'demo' ? 'tab on' : 'tab'}
            onClick={() => setMode('demo')}>Click through it, no key needed</button>
          <button type="button" role="tab" aria-selected={mode === 'live'} className={mode === 'live' ? 'tab on' : 'tab'}
            onClick={() => { demo.reset(); setMode('live') }}>Talk to it with your mic</button>
        </div>
      </header>

      <main className="layout">
        <section className="panel" aria-label="The call">
          {mode === 'demo' && (
            <>
              <p className="muted small demo-note">
                A replay. Every line was voiced with Flux TTS, and what “you” say is what Flux transcribed, once with
                each switch off and once on. Where takes varied, we kept the one that shows the switch clearly. Your
                own voice may land differently: try it live on the other tab.
              </p>
              <DemoCall demo={demo} />
            </>
          )}
          {mode === 'live' && (!apiKey || !config ? (
            <KeyEntry onKey={(k) => { setError(null); setApiKey(k) }} />
          ) : (
            <AgentProvider key={callId} config={config} autoStart={callId > 0}
              onSdkError={(e) => setError(e.message)}
              onError={(e) => setError(e.description ?? 'The agent reported an error.')}>
              <LiveCall code={code} toggles={toggles} voice={voice} tone={tone} error={error} onError={setError}
                onClearError={() => setError(null)} onForgetKey={() => { setApiKey(null); setError(null) }}
                onNext={setLiveNext} />
            </AgentProvider>
          ))}
        </section>
        {rail}
      </main>

      <CreditCta />

      <footer className="footer">
        Juniper Veterinary Clinic is fictional. Live calls run on your own Deepgram key and are billed to your project.
      </footer>
    </div>
  )
}
