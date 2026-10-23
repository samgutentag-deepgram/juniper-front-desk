import { useEffect, useRef } from 'react'
import { useAgentConversation } from '@deepgram/react'
import { splitOnCode } from '../lib/beats'
import type { Beats } from './useBeats'

export function Transcript({ beats, code }: { beats: Beats; code: string }) {
  const { conversation } = useAgentConversation()
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [conversation.length])

  if (conversation.length === 0) return null
  return (
    <ol className="transcript" aria-label="Transcript">
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
      <div ref={end} />
    </ol>
  )
}
