// The three switches on the right of the page. Each starts off, each means "on is better", and
// each is a change on the open call, never a reconnect. Same idea as the hold-please talk demo,
// rebuilt on the Voice Agent API.

export type ToggleName = 'bargeIn' | 'keyterms' | 'smartEot'
export type Toggles = Record<ToggleName, boolean>

export const ALL_OFF: Toggles = { bargeIn: false, keyterms: false, smartEot: false }

/** End of turn with the switch off: Flux's model is ignored and a dumb silence timer decides. */
export const DUMB_EOT = { eot_threshold: 1.0, eot_timeout_ms: 1200 }
/** Flux's defaults: the model decides, and a long pause is the backstop. */
export const SMART_EOT = { eot_threshold: 0.7, eot_timeout_ms: 5000 }

export interface DiffLine { op: ' ' | '+' | '-'; text: string }

export interface ToggleCard {
  title: string
  gist: string
  before: string
  after: string
  /** The script step that shows it. */
  stepId: string
  code: DiffLine[]
}

const l = (op: DiffLine['op'], text: string): DiffLine => ({ op, text })

export const TOGGLE_ORDER: ToggleName[] = ['bargeIn', 'keyterms', 'smartEot']

export const TOGGLE_CARDS: Record<ToggleName, ToggleCard> = {
  bargeIn: {
    title: 'Barge-in',
    gist: 'Stop talking when the caller does.',
    before: 'The agent finishes its speech no matter what. Anything you say over it is lost.',
    after: 'It stops mid-sentence, listens, and answers what you actually asked.',
    stepId: 'cut-in',
    code: [
      l(' ', '// the caller starts talking'),
      l(' ', "session.on('user-started-speaking', () => {"),
      l('-', '  // ignored: mic is muted while the agent talks'),
      l('+', '  player.interrupt()   // silence, now'),
      l(' ', '})'),
    ],
  },
  keyterms: {
    title: 'Keyterms',
    gist: 'Teach it the clinic’s words, on the call that is already open.',
    before: 'Flux has never heard "Gutentag", so the vet’s name comes out wrong and the lookup finds nobody.',
    after: 'The staff list goes to Flux mid-call. The name lands, and the lookup works.',
    stepId: 'name',
    code: [
      l(' ', 'session.updateListen({ provider: {'),
      l(' ', "  type: 'deepgram', version: 'v2',"),
      l(' ', "  model: 'flux-general-en',"),
      l('-', '  keyterms: [],'),
      l('+', "  keyterms: ['Gutentag', 'Okafor', 'Lindqvist'],"),
      l(' ', '} })'),
      l(' ', '// same call, no reconnect'),
    ],
  },
  smartEot: {
    title: 'Smart end of turn',
    gist: 'A pause is not the end of a sentence. Let Flux decide.',
    before: 'Any pause over a second ends your turn, so it answers half a sentence.',
    after: 'Flux hears that "and, um" is not finished, and waits for the rest.',
    stepId: 'ramble',
    code: [
      l(' ', 'session.updateListen({ provider: {'),
      l(' ', "  type: 'deepgram', version: 'v2',"),
      l(' ', "  model: 'flux-general-en',"),
      l('-', '  eot_threshold: 1.0,     // model ignored'),
      l('-', '  eot_timeout_ms: 1200,   // silence timer'),
      l('+', '  eot_threshold: 0.7,     // Flux decides'),
      l('+', '  eot_timeout_ms: 5000,'),
      l(' ', '} })'),
    ],
  },
}
