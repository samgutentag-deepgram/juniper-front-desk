import * as Switch from '@radix-ui/react-switch'
import { CHAPTERS, currentLine, type GuideState } from '../../lib/guide'
import { SCRIPT, spoken } from '../../lib/script'
import { TOGGLE_CARDS, type ToggleName, type Toggles } from '../../lib/toggles'

interface Props {
  state: GuideState
  toggles: Toggles
  live: boolean
  /** Replay only: say a line. */
  onSay?: (stepId: string) => void
  agentTalking: boolean
  callerTalking: boolean
  onToggle: (name: ToggleName, on: boolean) => void
  onGoto: (chapter: number) => void
  onSkip: () => void
}

export function Guide({ state, toggles, live, onSay, agentTalking, callerTalking, onToggle, onGoto, onSkip }: Props) {
  const ch = CHAPTERS[state.chapter]!
  const now = currentLine(state)
  const last = state.chapter === CHAPTERS.length - 1
  const toggleTitle = ch.toggle ? TOGGLE_CARDS[ch.toggle].title.toLowerCase() : ''

  const message =
    state.phase === 'flip' ? ch.flip
    : state.phase === 'done' ? ch.outro
    : state.phase === 'after' && ch.toggle ? `${TOGGLE_CARDS[ch.toggle].title} is on. Same ${ch.lines.length > 1 ? 'lines' : 'line'} again.`
    : ch.intro

  return (
    <section className={`guide phase-${state.phase}`} aria-label="Walkthrough">
      <ol className="stepper" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button type="button" aria-current={i === state.chapter ? 'step' : undefined}
              className={i === state.chapter ? 'on' : i < state.chapter ? 'past' : ''} onClick={() => onGoto(i)}>
              <span className="num">{i + 1}</span><span className="name">{c.short}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="guide-body">
        <h2>
          {ch.title}
          {ch.toggle && state.phase !== 'flip' && (
            <span className={`ab ${state.phase === 'before' ? 'a' : 'b'}`}>{state.phase === 'before' ? 'Before · switch off' : 'After · switch on'}</span>
          )}
        </h2>
        <p className="guide-msg" aria-live="polite">{message}</p>

        {state.phase === 'flip' && ch.toggle && (
          <label className="flip">
            <Switch.Root className="switch" checked={toggles[ch.toggle]} onCheckedChange={(on) => onToggle(ch.toggle!, on)}
              aria-label={TOGGLE_CARDS[ch.toggle].title}>
              <Switch.Thumb className="thumb" />
            </Switch.Root>
            <span>Turn {toggleTitle} on</span>
          </label>
        )}

        {(state.phase === 'before' || state.phase === 'after') && (
          <ol className="guide-lines">
            {ch.lines.map((id, i) => {
              const step = SCRIPT.find((s) => s.id === id)!
              const isNow = id === now
              const said = i < state.line
              // In the replay, the cut-in is the one line said over the agent; every other line waits
              // for it to finish, so a quick click never reads as talking over it.
              const isCutIn = id === 'cut-in' && !live
              const disabled = !live && (callerTalking || (isCutIn ? !agentTalking : agentTalking))
              const hint = !isNow ? undefined
                : isCutIn && !agentTalking ? 'Wait for it to start answering, then cut in.'
                : !live && !isCutIn && agentTalking ? 'Wait for the front desk to finish.'
                : step.hint
              return (
                <li key={id} className={isNow ? 'now' : said ? 'said' : ''}>
                  {onSay ? (
                    <button type="button" disabled={disabled} onClick={() => onSay(id)} aria-label={`Say: ${spoken(step)}`}>
                      <span className="say">“{spoken(step)}”</span>
                      {hint && <small>{hint}</small>}
                    </button>
                  ) : (
                    <div>
                      <span className="say">{isNow ? 'Say: ' : ''}“{spoken(step)}”</span>
                      {hint && <small>{hint}</small>}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        <div className="guide-actions">
          {state.phase === 'done' && ch.toggle && (
            <button type="button" className="btn small" onClick={() => onToggle(ch.toggle!, false)}>Hear the before again</button>
          )}
          {state.phase === 'done' && !last && (
            <button type="button" className="btn primary" onClick={() => onGoto(state.chapter + 1)}>
              Next: {CHAPTERS[state.chapter + 1]!.title} →
            </button>
          )}
          {live && now && <button type="button" className="link-btn" onClick={onSkip}>I said it, next</button>}
        </div>
      </div>
    </section>
  )
}
