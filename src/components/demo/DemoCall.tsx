import { useEffect, useRef } from 'react'
import { ScriptList } from '../ScriptList'
import { splitOnCode } from '../../lib/beats'
import { DEMO_CODE } from '../../lib/script'
import type { useDemo } from './useDemo'

export function DemoCall({ demo }: { demo: ReturnType<typeof useDemo> }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [demo.entries.length])

  return (
    <div className="convo">
      <div className="convo-head">
        <p className="mode" aria-live="polite">
          {demo.callerTalking ? 'You are talking…' : demo.agentTalking ? 'The front desk is talking. Say your next line to cut in.' : 'Click a line to say it'}
        </p>
        {demo.entries.length > 0 && <button type="button" className="link-btn" onClick={demo.reset}>Start over</button>}
      </div>
      {demo.entries.length > 0 && (
        <ol className="transcript" aria-label="Transcript">
          {demo.entries.map((e) => (
            <li key={e.key} className={`line ${e.role}`}>
              <span className="who">{e.role === 'user' ? 'You, as Flux heard it' : 'Front desk'}</span>
              <p>{withCode(e.text)}</p>
              {e.chips.map((c, i) => <span key={i} className={`chip ${c.kind}`}>{c.text}</span>)}
            </li>
          ))}
          <div ref={end} />
        </ol>
      )}
      <h3 className="script-title">Your lines</h3>
      <ScriptList done={demo.done} next={demo.next} onSay={demo.say} busy={demo.callerTalking} />
    </div>
  )
}

function withCode(text: string) {
  const parts = splitOnCode(text, DEMO_CODE)
  return parts ? <>{parts[0]}<mark className="code">{parts[1]}</mark>{parts[2]}</> : text
}
