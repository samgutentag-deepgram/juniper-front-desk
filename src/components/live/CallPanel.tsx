import { useEffect, useState } from 'react'
import { useAgentConversation, useAgentMicrophone, useAgentMode, useAgentPlayer, useAgentSession, useAgentState } from '@deepgram/react'
import { friendlyError } from '../../lib/errors'
import { AgentMicrophoneButton, Orb } from '@deepgram/ui'

interface Props {
  error: string | null
  onError: (message: string) => void
  onClearError: () => void
  onForgetKey: () => void
}

export function CallPanel({ error, onError, onClearError, onForgetKey }: Props) {
  const { isActive, isIdle, isConnecting, isReconnecting, start, stop } = useAgentState()
  const { mode } = useAgentMode()
  const { getInputVolume } = useAgentMicrophone()
  const { getOutputVolume } = useAgentPlayer()
  const { conversation } = useAgentConversation()
  const session = useAgentSession()
  const [callStarted, setCallStarted] = useState(false)
  useEffect(() => {
    const onApplied = () => setCallStarted(true)
    session.on('settings-applied', onApplied)
    return () => { session.off('settings-applied', onApplied) }
  }, [session])

  const orbState = mode === 'speaking' ? 'talking' : mode === 'listening' ? 'listening' : 'idle'

  return (
    <div className="call-panel">
      <div className="call-head">
        <Orb state={orbState} size={72} getInputVolume={getInputVolume} getOutputVolume={getOutputVolume} />
        <div className="call-controls">
          <p className="mode" aria-live="polite">{isActive ? modeLabel(mode) : 'Ready when you are'}</p>
          <div className="row">
            {/* Our own button: the library's has no label for the "disconnected" state after a failed start. */}
            <button
              type="button"
              className={isActive ? 'btn' : 'btn primary'}
              onClick={() => {
                if (isActive) { stop(); return }
                onClearError()
                start().catch((e: unknown) => onError(e instanceof Error ? e.message : String(e)))
              }}
            >
              {isConnecting ? 'Connecting…' : isReconnecting ? 'Reconnecting…' : isActive ? 'Hang up' : 'Start the call'}
            </button>
            {isActive && <AgentMicrophoneButton />}
          </div>
          {(isIdle || (!!error && !isActive)) && (
            <button type="button" className="link-btn" onClick={onForgetKey}>Use a different key</button>
          )}
        </div>
      </div>
      {error && <p className="error" role="alert">{friendlyError(error, callStarted)}</p>}
      {conversation.length === 0 && (
        <p className="muted">Press Start, allow the microphone, and read your first line below.</p>
      )}
    </div>
  )
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'speaking': return 'The front desk is talking. Cut in any time.'
    case 'thinking': return 'Thinking…'
    case 'listening': return 'Listening'
    default: return 'Connecting…'
  }
}
