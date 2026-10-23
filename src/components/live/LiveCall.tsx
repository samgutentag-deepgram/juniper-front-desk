import { useEffect, useRef } from 'react'
import { useAgentControls, useAgentConversation, useAgentMicrophone, useAgentMode, useAgentState } from '@deepgram/react'
import { listenSettings, speakSettings, type VoiceId } from '../../lib/agent-config'
import type { Toggles } from '../../lib/toggles'
import { CallPanel } from './CallPanel'
import { Transcript } from './Transcript'
import { useBeats } from './useBeats'

interface Props {
  code: string
  toggles: Toggles
  voice: VoiceId
  tone: number
  error: string | null
  onError: (message: string) => void
  onClearError: () => void
  onForgetKey: () => void
  /** Each new thing the caller says, for the walkthrough to match against its lines. */
  onUserLine: (text: string) => void
}

export function LiveCall(p: Props) {
  const { isConnected } = useAgentState()
  const { mode } = useAgentMode()
  const { updateListen, updateSpeak } = useAgentControls()
  const { setMicMuted } = useAgentMicrophone()
  const { conversation } = useAgentConversation()
  const beats = useBeats(p.code, p.toggles.keyterms)

  // Keyterms and end of turn: one UpdateListen with every switch, on the open call.
  useEffect(() => {
    if (isConnected) updateListen(listenSettings(p.toggles))
  }, [isConnected, p.toggles.keyterms, p.toggles.smartEot]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isConnected) updateSpeak(speakSettings(p.voice, p.tone))
  }, [isConnected, p.voice]) // eslint-disable-line react-hooks/exhaustive-deps

  // Barge-in off is the half-duplex agent: while it talks, the mic sends nothing, so nothing you
  // say can stop it. The Voice Agent API always listens, so "off" has to be done on our side.
  const mutedByUs = useRef(false)
  useEffect(() => {
    const shouldMute = !p.toggles.bargeIn && mode === 'speaking'
    if (shouldMute && !mutedByUs.current) { mutedByUs.current = true; setMicMuted(true) }
    if (!shouldMute && mutedByUs.current) { mutedByUs.current = false; setMicMuted(false) }
  }, [p.toggles.bargeIn, mode, setMicMuted])

  // Hand each new caller line to the walkthrough once.
  const seen = useRef(new Set<string>())
  useEffect(() => {
    for (const e of conversation) {
      if (e.role !== 'user' || seen.current.has(e.id)) continue
      seen.current.add(e.id)
      p.onUserLine(e.content)
    }
  }, [conversation]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="convo">
      <CallPanel error={p.error} onError={p.onError} onClearError={p.onClearError} onForgetKey={p.onForgetKey} />
      <Transcript beats={beats} code={p.code} />
    </div>
  )
}
