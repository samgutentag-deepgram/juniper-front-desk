import { SCRIPT, spoken } from '../lib/script'

interface Props {
  done: ReadonlySet<string>
  next: string | null
  /** Demo mode: lines are buttons. Live mode: lines are cue cards. */
  onSay?: (id: string) => void
  busy?: boolean
}

export function ScriptList({ done, next, onSay, busy }: Props) {
  return (
    <ol className="script" aria-label={onSay ? 'Your lines, click one to say it' : 'Your lines, say them out loud'}>
      {SCRIPT.map((s, i) => {
        const state = s.id === next ? 'next' : done.has(s.id) ? 'done' : ''
        const body = (
          <>
            <span className="n" aria-hidden="true">{done.has(s.id) ? '✓' : i + 1}</span>
            <span className="say">“{spoken(s)}”{s.id === next && s.hint && <small>{s.hint}</small>}</span>
          </>
        )
        return (
          <li key={s.id} className={state}>
            {onSay ? <button type="button" aria-label={`Say: ${spoken(s)}`} disabled={busy} onClick={() => onSay(s.id)}>{body}</button> : <div>{body}</div>}
          </li>
        )
      })}
    </ol>
  )
}
