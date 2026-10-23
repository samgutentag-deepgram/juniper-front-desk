import { TONES, VOICES, type VoiceId } from '../lib/agent-config'

interface Props {
  voice: VoiceId
  tone: number
  live: boolean
  current: boolean
  onVoice: (v: VoiceId) => void
  onTone: (t: number) => void
}

export function VoiceCard({ voice, tone, live, current, onVoice, onTone }: Props) {
  // The demo has no recordings in Marcus, so it only offers the voices it can play.
  const voices = live ? VOICES : VOICES.filter((v) => v.id !== 'flux-marcus-en')
  return (
    <article className={`tcard voice${current ? ' current' : ''}`} aria-label="Voice and tone">
      <header className="tcard-head">
        <h3>Voice and tone</h3>
        {current && <span className="tag">Try it now</span>}
      </header>
      <p className="gist">Flux TTS reads the booking reference and phone number the way a person would.</p>
      <label className="label" htmlFor="voice">Voice{live ? ', changes on the open call' : ''}</label>
      <select id="voice" value={voice} onChange={(e) => onVoice(e.target.value as VoiceId)}>
        {voices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <span className="label">Delivery{live ? ', restarts the call' : ''}</span>
      <div className="segmented" role="radiogroup" aria-label="Delivery">
        {TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={tone === t.value}
            className={tone === t.value ? 'seg on' : 'seg'}
            onClick={() => tone !== t.value && onTone(t.value)}
          >{t.label}</button>
        ))}
      </div>
    </article>
  )
}
