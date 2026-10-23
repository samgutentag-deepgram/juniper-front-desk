import { useEffect, useMemo, useRef } from 'react'
import { useAgentControls, useAgentConversation, useAgentMicrophone, useAgentMode, useAgentState } from '@deepgram/react'
import { listenSettings, speakSettings, type VoiceId } from '../../lib/agent-config'
import { matchStep, SCRIPT } from '../../lib/script'
import type { Toggles } from '../../lib/toggles'
import { ScriptList } from '../ScriptList'
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
  onNext: (stepId: string | null) => void
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

  // Script progress from what the caller actually said.
  const done = useMemo(() => {
    const ids = new Set<number>()
    for (const e of conversation) {
      if (e.role !== 'user') continue
      const i = matchStep(e.content, ids)
      if (i !== null) ids.add(i)
    }
    return new Set([...ids].map((i) => SCRIPT[i]!.id))
  }, [conversation])
  const next = SCRIPT.find((s) => !done.has(s.id))?.id ?? null
  useEffect(() => { p.onNext(next) }, [next]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="convo">
      <CallPanel error={p.error} onError={p.onError} onClearError={p.onClearError} onForgetKey={p.onForgetKey} />
      <Transcript beats={beats} code={p.code} />
      <h3 className="script-title">Your lines, say them out loud</h3>
      <ScriptList done={done} next={next} />
    </div>
  )
}
