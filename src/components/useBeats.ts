import { useEffect, useMemo, useRef, useState } from 'react'
import { useAgentConversation, useAgentMode, useAgentSession } from '@deepgram/react'
import { nameHeard, saidCode, type NameHeard } from '../lib/beats'

export interface Beats {
  /** Agent lines the caller talked over. */
  interrupted: Set<string>
  names: { entryId: string; heard: NameHeard; keyterms: boolean }[]
  codeSpoken: boolean
}

export function useBeats(code: string, keyterms: boolean): Beats {
  const session = useAgentSession()
  const { mode } = useAgentMode()
  const { conversation } = useAgentConversation()
  const [interrupted, setInterrupted] = useState<Set<string>>(new Set())

  const modeRef = useRef(mode)
  modeRef.current = mode
  const lastAgentId = useRef<string | null>(null)
  lastAgentId.current = [...conversation].reverse().find((e) => e.role === 'assistant')?.id ?? null

  // A barge-in is the caller starting to speak while the agent's audio is still playing. The
  // provider already stops playback on UserStartedSpeaking; this only records that it happened.
  useEffect(() => {
    const onUserSpeaking = () => {
      const id = lastAgentId.current
      if (modeRef.current === 'speaking' && id) setInterrupted((s) => new Set(s).add(id))
    }
    session.on('user-started-speaking', onUserSpeaking)
    return () => { session.off('user-started-speaking', onUserSpeaking) }
  }, [session])

  // Keyterms state at the moment each line arrived, so flipping the switch later does not rewrite history.
  const keytermsAt = useRef(new Map<string, boolean>())
  for (const e of conversation) {
    if (e.role === 'user' && !keytermsAt.current.has(e.id)) keytermsAt.current.set(e.id, keyterms)
  }

  const names = useMemo(
    () => conversation.flatMap((e) => {
      if (e.role !== 'user') return []
      const heard = nameHeard(e.content)
      return heard ? [{ entryId: e.id, heard, keyterms: keytermsAt.current.get(e.id) ?? keyterms }] : []
    }),
    [conversation, keyterms],
  )

  const codeSpoken = conversation.some((e) => e.role === 'assistant' && saidCode(e.content, code))

  return { interrupted, names, codeSpoken }
}
