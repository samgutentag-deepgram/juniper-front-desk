import { useState, type FormEvent } from 'react'
import { CREDIT_CTA } from '../lib/cta'

export function KeyForm({ onKey }: { onKey: (key: string) => void }) {
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const key = value.trim()
    if (key) onKey(key)
  }
  return (
    <form className="key-form" onSubmit={submit}>
      <h2>1. Bring your Deepgram key</h2>
      <p className="muted">
        Paste an API key from your Deepgram console. It goes from this browser straight to Deepgram to open
        the call. This site's server never sees it and nothing is stored: reload the page and it is gone.
      </p>
      <label htmlFor="dg-key" className="label">Deepgram API key</label>
      <div className="key-row">
        <input
          id="dg-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn primary" disabled={!value.trim()}>Use this key</button>
      </div>
      <p className="muted small">
        No key yet? <a href={CREDIT_CTA.url} target="_blank" rel="noreferrer">Sign up and claim the Flux TTS credit</a>,
        then come back. Headphones help: the agent can hear your speakers.
      </p>
    </form>
  )
}
