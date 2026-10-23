import * as ToggleGroup from '@radix-ui/react-toggle-group'
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
      <p className="gist">Hear Flux TTS read the booking reference back in another voice or tone.</p>
      <div className="voice-row">
      <select id="voice" aria-label={`Voice${live ? ', changes on the open call' : ''}`} value={voice} onChange={(e) => onVoice(e.target.value as VoiceId)}>
        {voices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <ToggleGroup.Root
        type="single"
        className="segmented"
        value={String(tone)}
        onValueChange={(v) => { if (v !== '') onTone(Number(v)) }}
        aria-label={`Delivery${live ? ', restarts the call' : ''}`}
      >
        {TONES.map((t) => (
          <ToggleGroup.Item key={t.value} value={String(t.value)} className="seg">{t.label}</ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      </div>
    </article>
  )
}
