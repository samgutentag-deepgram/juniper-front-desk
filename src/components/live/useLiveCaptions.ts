import { useEffect, useRef, useState } from 'react'
import { useAgentSession, useAgentState } from '@deepgram/react'
import { captionsConfigure, captionsUrl } from '../../lib/captions'
import type { Toggles } from '../../lib/toggles'

/** What Flux has heard of the caller's current turn, word by word, or '' between turns. */
export function useLiveCaptions(apiKey: string, toggles: Toggles): string {
  const session = useAgentSession()
  const { isConnected } = useAgentState()
  const [partial, setPartial] = useState('')
  const ws = useRef<WebSocket | null>(null)
  const togglesRef = useRef(toggles)
  togglesRef.current = toggles

  useEffect(() => {
    if (!isConnected) return
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined

    const open = () => {
      const socket = new WebSocket(captionsUrl(togglesRef.current), ['token', apiKey])
      ws.current = socket
      socket.onmessage = (e) => {
        if (typeof e.data !== 'string') return
        try {
          const m = JSON.parse(e.data)
          if (m.type !== 'TurnInfo') return
          if (m.event === 'EndOfTurn') setPartial('')
          else if (m.event === 'StartOfTurn' || m.event === 'Update') setPartial(m.transcript || '…')
        } catch {
          // A malformed frame only costs one caption update.
        }
      }
      // Flux closes an idle stream, which happens while barge-in off mutes the mic. Reopen it.
      socket.onclose = () => {
        if (ws.current === socket) ws.current = null
        if (!stopped) retry = setTimeout(open, 1000)
      }
      socket.onerror = () => socket.close()
    }
    open()

    // Tee the agent's mic audio into the captions stream. The provider looks sendAudio up on the
    // session each frame, so wrapping the method is enough.
    const original = session.sendAudio.bind(session)
    session.sendAudio = (data: ArrayBuffer) => {
      original(data)
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(data)
    }

    return () => {
      stopped = true
      clearTimeout(retry)
      session.sendAudio = original
      ws.current?.close()
      ws.current = null
      setPartial('')
    }
  }, [isConnected, session, apiKey])

  // Switches change the captions stream the same way they change the agent: on the open socket.
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(captionsConfigure(toggles)))
  }, [toggles.keyterms, toggles.smartEot]) // eslint-disable-line react-hooks/exhaustive-deps

  return partial
}
