// What the walkthrough watches for in the transcript. Pure functions, so the tests can pin them.

/** Ways Flux writes the vet's surname without keyterms when "Doctor" is not in front of it. */
const NAME_PATTERN = /\b(?:g(?:u|oo|ou)t+en|good(?:[\s-]+and)?|gluten)[\s-]*tag+\b/i
const AFTER_DOCTOR = /\b(?:doctor|dr)\.?\s+([a-z'-]+)(?:[\s-]+([a-z'-]+))?/i
const OTHER_STAFF = /^(okafor|lindqvist)$/i

export interface NameHeard {
  text: string
  exact: boolean
}

/** How the transcript wrote the vet's name. Only "Gutentag", one word, matches the staff list. */
export function nameHeard(utterance: string): NameHeard | null {
  const d = utterance.match(AFTER_DOCTOR)
  if (d && d[1] && !OTHER_STAFF.test(d[1])) {
    const [first, second] = [d[1], d[2]]
    if (first === 'Gutentag') return { text: first, exact: true }
    if (second && /^tag+$/i.test(second)) return { text: `${first} ${second}`, exact: false }
    return { text: first, exact: false }
  }
  const m = utterance.match(NAME_PATTERN)
  if (!m) return null
  return { text: m[0], exact: m[0] === 'Gutentag' }
}

export function saidCode(agentLine: string, code: string): boolean {
  return agentLine.toUpperCase().includes(code.toUpperCase())
}

/** Splits a line around the booking reference so the UI can mark it. */
export function splitOnCode(line: string, code: string): [string, string, string] | null {
  const i = line.toUpperCase().indexOf(code.toUpperCase())
  if (i < 0) return null
  return [line.slice(0, i), line.slice(i, i + code.length), line.slice(i + code.length)]
}
