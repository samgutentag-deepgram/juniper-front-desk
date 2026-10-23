import { useState, type FormEvent } from 'react'
import { signupUrl } from '../lib/cta'

export function KeyEntry({ onKey }: { onKey: (key: string) => void }) {
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const key = value.trim()
    if (key) onKey(key)
  }
  return (
    <form className="key-form" onSubmit={submit}>
      <p>
        Talk to the front desk with your own microphone. Paste a Deepgram API key: it goes from this browser
        straight to Deepgram to open the call. This site never sees it, and a reload forgets it.
      </p>
      <label htmlFor="dg-key" className="label">Deepgram API key</label>
      <div className="key-row">
        <input id="dg-key" type="password" autoComplete="off" spellCheck={false} placeholder="Paste your key"
          value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit" className="btn primary" disabled={!value.trim()}>Use this key</button>
      </div>
      <p className="muted small">
        No key yet? <a href={signupUrl('key-entry')} target="_blank" rel="noreferrer">Sign up and claim the Flux TTS credit</a>.
        Use headphones: the agent can hear your speakers.
      </p>
    </form>
  )
}
