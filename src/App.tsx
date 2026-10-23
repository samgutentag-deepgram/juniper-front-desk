import { useMemo, useState } from 'react'
import { AgentProvider } from '@deepgram/react'
import { sessionConfig, type VoiceId } from './lib/agent-config'
import { makeConfirmationCode } from './lib/clinic'
import { KeyForm } from './components/KeyForm'
import { CallView } from './components/CallView'
import { Walkthrough } from './components/Walkthrough'
import { CreditCta } from './components/CreditCta'

export interface LiveSettings {
  voice: VoiceId
  tone: number
  keyterms: boolean
}

export function App() {
  // The key lives in memory only. A reload forgets it, on purpose.
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [settings, setSettings] = useState<LiveSettings>({ voice: 'flux-haley-en', tone: 0, keyterms: false })
  const [callId, setCallId] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // A new provider per call id: tone is fixed for a session, so changing it starts a fresh call.
  // Voice and keyterms change live on the open socket and do not touch this.
  const code = useMemo(() => makeConfirmationCode(), [callId])
  const config = useMemo(() => (apiKey ? sessionConfig(apiKey, { ...settings, confirmationCode: code }) : null), [apiKey, callId])

  const restart = (next: Partial<LiveSettings>) => {
    setSettings((s) => ({ ...s, ...next }))
    setCallId((n) => n + 1)
  }

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Deepgram Voice Agent API · Flux · Flux TTS</p>
        <h1>Call the Juniper Veterinary Clinic front desk</h1>
        <p className="lede">
          You just adopted a dog and need a vet. Call the clinic from your browser, then try the four things
          that break voice agents on real callers: talking over it, a name it has never heard, a booking
          reference read back to you, and the tone of the voice.
        </p>
      </header>

      {apiKey && config ? (
        <AgentProvider
          key={callId}
          autoStart={callId > 0}
          config={config}
          onSdkError={(e) => setError(e.message)}
          onError={(e) => setError(e.description ?? 'The agent reported an error.')}
        >
          <main className="layout">
            <CallView
              code={code}
              settings={settings}
              error={error}
              onError={setError}
              onClearError={() => setError(null)}
              onForgetKey={() => { setApiKey(null); setError(null) }}
              onLiveChange={(next) => setSettings((s) => ({ ...s, ...next }))}
              onToneChange={(tone) => restart({ tone })}
            />
          </main>
        </AgentProvider>
      ) : (
        <main className="layout">
          <section className="panel call" aria-label="The call">
            <KeyForm onKey={(k) => { setError(null); setApiKey(k) }} />
          </section>
          <Walkthrough.Preview />
        </main>
      )}

      <CreditCta />

      <footer className="footer">
        Juniper Veterinary Clinic is fictional. Calls run on your own Deepgram key and are billed to your project.
      </footer>
    </div>
  )
}
