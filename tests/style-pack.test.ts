import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Literal colors and fonts live only in src/styles/packs/, so a theme swap is one import line.
// Lines that reference a token are fine; a literal anywhere else fails.
const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(|font-family:|fontFamily/

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? files(p) : /\.(css|ts|tsx|js)$/.test(name) ? [p] : []
  })
}

describe('style pack', () => {
  it('keeps literal colors and fonts inside src/styles/packs/', () => {
    const leaks = files('src')
      .filter((f) => !f.includes(path.join('styles', 'packs')))
      .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => ({ f, i, line })))
      .filter(({ line }) => LITERAL.test(line) && !line.includes('var(--'))
      .map(({ f, i, line }) => `${f}:${i + 1}: ${line.trim()}`)
    expect(leaks).toEqual([])
  })
})
