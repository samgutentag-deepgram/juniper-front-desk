import { useEffect, useRef } from 'react'
import { useAgentConversation } from '@deepgram/react'
import { splitOnCode } from '../../lib/beats'
import type { Beats } from './useBeats'
import type { HistoryLine } from '../../lib/guide'

interface Props {
  beats: Beats
  code: string
  /** The call so far, when it was started from a later chapter. */
  history: HistoryLine[]
  /** What Flux has heard of the turn in progress. */
  partial: string
}

export function Transcript({ beats, code, history, partial }: Props) {
  const { conversation } = useAgentConversation()
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [conversation.length, partial])

  if (conversation.length === 0 && history.length === 0 && !partial) return null
  return (
    <ol className="transcript" aria-label="Transcript">
      {history.length > 0 && <li className="divider"><span>Earlier in the call</span></li>}
      {history.map((h, i) => (
        <li key={`h${i}`} className={`line ${h.role} seeded`}>
          <span className="who">{h.role === 'user' ? 'You' : 'Front desk'}</span>
          <p>{h.content}</p>
        </li>
      ))}
      {history.length > 0 && <li className="divider"><span>Now, live</span></li>}
      {conversation.map((e) => {
        const name = beats.names.find((n) => n.entryId === e.id)
        const parts = e.role === 'assistant' ? splitOnCode(e.content, code) : null
        return (
          <li key={e.id} className={`line ${e.role}`}>
            <span className="who">{e.role === 'user' ? 'You' : 'Front desk'}</span>
            <p>
              {parts ? <>{parts[0]}<mark className="code">{parts[1]}</mark>{parts[2]}</> : e.content}
            </p>
            {beats.interrupted.has(e.id) && <span className="chip live">You cut in here</span>}
            {name && (
              <span className={`chip ${name.heard.exact ? 'ok' : 'warn'}`}>
                Flux heard “{name.heard.text}” · keyterms {name.keyterms ? 'on' : 'off'}
              </span>
            )}
          </li>
        )
      })}
      {partial && (
        <li className="line user interim" aria-live="polite">
          <span className="who">You, as Flux hears it</span>
          <p>{partial}<span className="caret" aria-hidden="true" /></p>
        </li>
      )}
      <div ref={end} />
    </ol>
  )
}
