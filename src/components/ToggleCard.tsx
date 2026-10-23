import * as Switch from '@radix-ui/react-switch'
import { TOGGLE_CARDS, type ToggleName } from '../lib/toggles'

interface Props {
  name: ToggleName
  on: boolean
  /** The script's next line is the one this switch is about. */
  current: boolean
  /** The walkthrough is waiting for this switch. */
  flip?: boolean
  onChange: (on: boolean) => void
}

export function ToggleCard({ name, on, current, flip, onChange }: Props) {
  const card = TOGGLE_CARDS[name]
  return (
    <article className={`tcard ${on ? 'on' : 'off'}${current ? ' current' : ''}${flip ? ' flip-me' : ''}`} aria-label={card.title}>
      <header className="tcard-head">
        <h3>{card.title}</h3>
        {current && <span className="tag">{flip ? 'Flip me' : 'This chapter'}</span>}
        <Switch.Root className="switch" checked={on} onCheckedChange={onChange} aria-label={card.title}>
          <Switch.Thumb className="thumb" />
        </Switch.Root>
      </header>
      <dl className="before-after">
        <div className={on ? '' : 'live'}><dt>Off</dt><dd>{card.before}</dd></div>
        <div className={on ? 'live' : ''}><dt>On</dt><dd>{card.after}</dd></div>
      </dl>
      <details className="code">
        <summary>The change</summary>
        <pre>{card.code.map((l, i) => <span key={i} className={l.op === '+' ? 'add' : l.op === '-' ? 'del' : ''}>{`${l.op} ${l.text}\n`}</span>)}</pre>
      </details>
    </article>
  )
}
