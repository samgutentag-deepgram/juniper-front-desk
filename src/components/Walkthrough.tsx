import { useAgentControls, useAgentState } from '@deepgram/react'
import { listenSettings, speakSettings, TONES, VOICES, type VoiceId } from '../lib/agent-config'
import type { LiveSettings } from '../App'
import type { Beats } from './useBeats'

interface Props {
  beats: Beats
  code: string
  settings: LiveSettings
  onLiveChange: (next: Partial<LiveSettings>) => void
  onToneChange: (tone: number) => void
}

export function Walkthrough({ beats, code, settings, onLiveChange, onToneChange }: Props) {
  const { isConnected } = useAgentState()
  const { updateListen, updateSpeak } = useAgentControls()

  const setKeyterms = (on: boolean) => {
    onLiveChange({ keyterms: on })
    // Sent on the open socket. No reconnect, the call keeps going.
    if (isConnected) updateListen(listenSettings(on))
  }
  const setVoice = (voice: VoiceId) => {
    onLiveChange({ voice })
    if (isConnected) updateSpeak(speakSettings(voice, settings.tone))
  }

  const nameFixed = beats.names.some((n) => n.heard.exact && n.keyterms)
  const nameBroke = beats.names.some((n) => !n.heard.exact)

  return (
    <aside className="panel walkthrough" aria-label="Try these">
      <h2>2. Try these four things</h2>
      <ol className="steps">
        <Step n={1} title="Talk over it" done={beats.interrupted.size > 0}>
          <p>Ask <q>What happens at his first wellness exam?</q> It gives a long answer. Start talking before it finishes.</p>
          <p className="muted">Flux hears you start a turn and the agent stops mid-sentence, then answers what you actually asked.</p>
        </Step>

        <Step n={2} title="Say a name it has never heard" done={nameFixed}>
          <p>With clinic vocabulary off, ask <q>Can he see Doctor Gutentag?</q> Watch how the name lands in the transcript.</p>
          <label className="switch">
            <input type="checkbox" checked={settings.keyterms} onChange={(e) => setKeyterms(e.target.checked)} />
            <span>Clinic vocabulary (keyterms) {settings.keyterms ? 'on' : 'off'}</span>
          </label>
          <p className="muted">
            {nameBroke && !nameFixed
              ? 'There it is. Now flip the switch mid-call and say the name again.'
              : 'The switch pushes the staff list to Flux on the open call. No reconnect.'}
          </p>
        </Step>

        <Step n={3} title="Book a time, hear the reference" done={beats.codeSpoken}>
          <p>Say <q>Friday at ten. Actually, make it one.</q> The front desk reads back a booking reference and a text line.</p>
          <p className="ref">Your reference this call: <mark className="code">{code}</mark></p>
          <p className="muted">Letters, digits and dashes, spoken the way a person reads them. That is Flux TTS.</p>
        </Step>

        <Step n={4} title="Change the voice and tone" done={settings.voice !== 'flux-haley-en' || settings.tone !== 0}>
          <label className="label" htmlFor="voice">Voice, changes live</label>
          <select id="voice" value={settings.voice} onChange={(e) => setVoice(e.target.value as VoiceId)}>
            {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <span className="label">Delivery, restarts the call</span>
          <div className="segmented" role="radiogroup" aria-label="Delivery">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={settings.tone === t.value}
                className={settings.tone === t.value ? 'seg on' : 'seg'}
                onClick={() => settings.tone !== t.value && onToneChange(t.value)}
              >{t.label}</button>
            ))}
          </div>
          <p className="muted">Calm to animated is Flux TTS expressivity, set per call.</p>
        </Step>
      </ol>
    </aside>
  )
}

Walkthrough.Preview = function Preview() {
  return (
    <aside className="panel walkthrough" aria-label="What you will try">
      <h2>2. Then try four things</h2>
      <ol className="steps">
        <Step n={1} title="Talk over it" done={false}><p className="muted">Cut in mid-answer and it stops to listen.</p></Step>
        <Step n={2} title="Say a name it has never heard" done={false}><p className="muted">Hear “Gutentag” break, then fix it with keyterms on the live call.</p></Step>
        <Step n={3} title="Book a time, hear the reference" done={false}><p className="muted">A booking reference and phone number, read back cleanly.</p></Step>
        <Step n={4} title="Change the voice and tone" done={false}><p className="muted">Swap Flux TTS voices live, from calm to animated.</p></Step>
      </ol>
    </aside>
  )
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className={done ? 'step done' : 'step'}>
      <div className="step-head">
        <span className="step-n" aria-hidden="true">{done ? '✓' : n}</span>
        <h3>{title}</h3>
      </div>
      <div className="step-body">{children}</div>
    </li>
  )
}
