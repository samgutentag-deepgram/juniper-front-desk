// The call, as a script both modes share. The no-key demo plays it back with recorded audio and
// picks the before or after take from the switches; the live call shows the next line to say and
// advances when the caller says something close. On a live call the LLM answers in its own words.

import { TEXT_LINE } from './clinic'
import type { ToggleName } from './toggles'

/** The demo's fixed booking reference. Live calls get a fresh one each time. */
export const DEMO_CODE = 'JV-7Q3K'

export interface ScriptStep {
  id: string
  /** What the visitor says. A " | " marks a long pause inside the line. */
  say: string
  /** The switch this line shows off, if any. */
  toggle?: ToggleName
  /** One line on what to try. */
  hint?: string
  /** Lowercased fragments; on a live call a line completes the step when it contains any of them. */
  match: string[]
  /** The front desk's reply in the demo, or one reply per switch position. `{heard}` is what Flux transcribed. */
  agent: string | { off: string; on: string }
}

export const SCRIPT: ScriptStep[] = [
  {
    id: 'adopted',
    say: 'Hi, I just adopted a dog, and he needs a vet.',
    match: ['adopt', 'new dog', 'a vet'],
    agent: "That's wonderful, congratulations! What's his name?",
  },
  {
    id: 'otto',
    say: 'His name is Otto.',
    match: ['otto', 'auto', 'name is', "name's"],
    agent: 'Hello Otto! How can I help with him?',
  },
  {
    id: 'exam',
    say: 'What happens at his first wellness exam?',
    toggle: 'bargeIn',
    hint: 'A long answer. Say the next line before it finishes.',
    match: ['wellness', 'exam', 'first visit'],
    agent: "At his first wellness exam the vet does a nose to tail check: his weight, heart and lungs, eyes, ears, teeth, skin and joints. We'll run a heartworm test, and a fecal test too, so bring a stool sample if you can. He'll get the core vaccines a new dog usually needs. Then the microchip goes in, a quick injection between the shoulder blades, no anesthesia, and it's registered to you that day. The whole visit takes about forty five minutes.",
  },
  {
    id: 'cut-in',
    say: 'Sorry, actually, can we just get him signed up?',
    toggle: 'bargeIn',
    hint: 'Say it while the agent is still talking.',
    match: ['sign', 'new patient', 'register'],
    agent: "Of course, I can set him up as a new patient. Is there a vet you'd like him to see?",
  },
  {
    id: 'name',
    say: 'Can he see Doctor Gutentag?',
    toggle: 'keyterms',
    hint: 'Try it with keyterms off, then on.',
    match: ['doctor', 'dr', 'tag'],
    agent: {
      off: "I don't see a Doctor {heard} at our clinic. Could you say the vet's name once more?",
      on: 'Yes, Doctor Gutentag is seeing new patients. He has Thursday at two in the afternoon, or Friday at ten in the morning or one in the afternoon.',
    },
  },
  {
    id: 'ramble',
    say: "So, I work from home most days, but on Tuesdays, and, um, | Thursdays, I'm in the office, so what do you have later in the week?",
    toggle: 'smartEot',
    hint: 'Pause after "um". Try it with smart end of turn off, then on.',
    match: ['office', 'tuesday', 'thursday', 'work from home', 'later in the week'],
    agent: {
      off: 'Got it. Doctor Gutentag has Thursday at two in the afternoon. Does that work?',
      on: 'Later in the week, Doctor Gutentag has Friday at ten in the morning or one in the afternoon. Which works for you?',
    },
  },
  {
    id: 'booking',
    say: "Friday at ten. Actually, let's make it one.",
    hint: 'Listen to the booking reference and the phone number.',
    match: ['friday', 'make it one'],
    agent: `You'd like to bring Otto in on Friday at one in the afternoon. Your booking reference is ${DEMO_CODE}. The front desk will text you from ${TEXT_LINE} to confirm. Is there anything else?`,
  },
  {
    id: 'again',
    say: 'Can you read me that reference once more?',
    hint: 'Pick a different voice or tone first.',
    match: ['once more', 'again', 'repeat', 'reference'],
    agent: `Sure. Your booking reference is ${DEMO_CODE}, and the front desk will text you from ${TEXT_LINE}.`,
  },
  {
    id: 'bye',
    say: "That's all for now, thank you.",
    match: ["that's all", 'thanks', 'thank you', 'bye'],
    agent: 'You are welcome. We look forward to meeting Otto.',
  },
]

/** The line as shown and spoken, without the pause marker. */
export const spoken = (step: ScriptStep) => step.say.replace(' | ', ' ')

/** Which step a caller line completes, given the steps already done, or null when it is off
 *  script. Only the next step or the one after can match, so a stray word cannot jump ahead. */
export function matchStep(text: string, done: ReadonlySet<number>): number | null {
  const lower = text.toLowerCase()
  const next = SCRIPT.findIndex((_, i) => !done.has(i))
  if (next < 0) return null
  for (const i of [next, next + 1]) {
    const step = SCRIPT[i]
    if (step && !done.has(i) && step.match.some((m) => lower.includes(m))) return i
  }
  return null
}
