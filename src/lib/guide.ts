// The walkthrough. The call is cut into chapters, one per switch, and each chapter is an A/B:
// say its lines with the switch off, flip it, say them again with it on. The phase follows the
// switch, so a visitor can flip back and forth and hear the before and after as often as they like.

import type { ToggleName, Toggles } from './toggles'

export interface Chapter {
  id: string
  title: string
  /** Short name for the stepper. */
  short: string
  toggle?: ToggleName
  /** Script step ids, in order. */
  lines: string[]
  /** Before the first run. */
  intro: string
  /** After the "off" run: what just happened, and to flip the switch. */
  flip?: string
  /** After the "on" run (or the only run): what changed. */
  outro: string
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'hello', title: 'Say hello', short: 'Hello',
    lines: ['adopted', 'otto'],
    intro: 'Warm up. Tell the front desk about your new dog.',
    outro: 'That is a normal call. Now break it.',
  },
  {
    id: 'bargeIn', title: 'Barge-in', short: 'Barge-in', toggle: 'bargeIn',
    lines: ['exam', 'cut-in'],
    intro: 'Barge-in is off. Ask an open question, then cut in while it is still answering.',
    flip: 'It kept talking and never heard you. Turn barge-in on, then run the same two lines again.',
    outro: 'With barge-in on it stopped mid-sentence and answered what you actually asked.',
  },
  {
    id: 'keyterms', title: 'Keyterms', short: 'Keyterms', toggle: 'keyterms',
    lines: ['name'],
    intro: 'Keyterms are off. Ask for the vet by name and watch how Flux writes it.',
    flip: 'Flux has never heard "Gutentag", so the lookup found nobody. Turn keyterms on and ask again. Same call, no reconnect.',
    outro: 'With the staff list as keyterms, the name landed and the front desk found him.',
  },
  {
    id: 'smartEot', title: 'Smart end of turn', short: 'Turn end', toggle: 'smartEot',
    lines: ['ramble'],
    intro: 'Smart end of turn is off. Say the long line, with a pause after "um".',
    flip: 'A one-second silence timer ended your turn at the pause, so it answered half a sentence. Turn smart end of turn on and say it again.',
    outro: 'Flux heard that "and, um" was not finished and waited for the rest of the sentence.',
  },
  {
    id: 'booking', title: 'Booking reference', short: 'Booking',
    lines: ['booking', 'again'],
    intro: 'Book a time. Listen to how Flux TTS reads back the reference and the phone number.',
    outro: 'Letters, digits and dashes, read the way a person would. Try another voice or tone and ask again.',
  },
  {
    id: 'bye', title: 'Hang up', short: 'Bye',
    lines: ['bye'],
    intro: 'That is the tour. Say goodbye.',
    outro: 'Now try it with your own voice on the Live tab, or claim the credit and build your own.',
  },
]

export type Phase = 'before' | 'flip' | 'after' | 'done'

export interface GuideState {
  chapter: number
  phase: Phase
  /** Lines said in the current run. */
  line: number
}

export type GuideEvent =
  | { type: 'said'; stepId: string }
  | { type: 'toggled'; name: ToggleName; on: boolean }
  | { type: 'goto'; chapter: number }
  /** Live calls: the visitor says the line is done when detection missed it. */
  | { type: 'skip' }

export const START: GuideState = { chapter: 0, phase: 'before', line: 0 }

/** The run a chapter starts in, given the switches. */
export function phaseFor(chapter: Chapter, toggles: Toggles): Phase {
  return chapter.toggle && toggles[chapter.toggle] ? 'after' : 'before'
}

export function guide(state: GuideState, event: GuideEvent, toggles: Toggles): GuideState {
  const ch = CHAPTERS[state.chapter]!
  switch (event.type) {
    case 'goto': {
      const next = CHAPTERS[event.chapter]
      if (!next) return state
      return { chapter: event.chapter, phase: phaseFor(next, toggles), line: 0 }
    }
    case 'toggled': {
      if (event.name !== ch.toggle) return state
      // The phase follows the switch: on is the after run, off is the before run, from the top.
      return { ...state, phase: event.on ? 'after' : 'before', line: 0 }
    }
    case 'said':
    case 'skip': {
      if (state.phase === 'flip' || state.phase === 'done') {
        // Saying a line of this chapter again starts another run of the same kind.
        if (event.type === 'said' && ch.lines.includes(event.stepId)) {
          return guide({ ...state, phase: phaseFor(ch, toggles), line: 0 }, event, toggles)
        }
        return state
      }
      let line: number
      if (event.type === 'skip') line = state.line + 1
      else {
        const i = ch.lines.indexOf(event.stepId)
        if (i < 0) return state
        // Asking an earlier line again (the long question, say) restarts the run from there.
        line = i + 1
      }
      if (line < ch.lines.length) return { ...state, line }
      const finished: Phase = state.phase === 'before' && ch.toggle ? 'flip' : 'done'
      return { ...state, phase: finished, line }
    }
  }
}

/** The step the visitor should say now, or null between runs. */
export function currentLine(state: GuideState): string | null {
  if (state.phase === 'flip' || state.phase === 'done') return null
  return CHAPTERS[state.chapter]!.lines[state.line] ?? null
}

/** Divider text for the transcript: which chapter, and which side of the A/B. */
export function runLabel(state: GuideState): string {
  const ch = CHAPTERS[state.chapter]!
  if (!ch.toggle) return ch.title
  return `${ch.title} · ${state.phase === 'after' || state.phase === 'done' ? 'on' : 'off'}`
}
