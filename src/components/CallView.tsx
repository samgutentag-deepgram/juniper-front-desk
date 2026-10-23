import type { LiveSettings } from '../App'
import { CallPanel } from './CallPanel'
import { Transcript } from './Transcript'
import { useBeats } from './useBeats'
import { Walkthrough } from './Walkthrough'

interface Props {
  code: string
  settings: LiveSettings
  error: string | null
  onError: (message: string) => void
  onClearError: () => void
  onForgetKey: () => void
  onLiveChange: (next: Partial<LiveSettings>) => void
  onToneChange: (tone: number) => void
}

export function CallView(p: Props) {
  const beats = useBeats(p.code, p.settings.keyterms)
  return (
    <>
      <section className="panel call" aria-label="The call">
        <CallPanel error={p.error} onError={p.onError} onClearError={p.onClearError} onForgetKey={p.onForgetKey} />
        <Transcript beats={beats} code={p.code} />
      </section>
      <Walkthrough beats={beats} code={p.code} settings={p.settings} onLiveChange={p.onLiveChange} onToneChange={p.onToneChange} />
    </>
  )
}
