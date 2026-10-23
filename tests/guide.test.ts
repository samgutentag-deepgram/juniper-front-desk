import { describe, expect, it } from 'vitest'
import { CHAPTERS, currentLine, guide, START, type GuideState } from '../src/lib/guide'
import { SCRIPT } from '../src/lib/script'
import { ALL_OFF } from '../src/lib/toggles'

const barge = CHAPTERS.findIndex((c) => c.id === 'bargeIn')

describe('chapters', () => {
  it('cover every script line exactly once, in script order', () => {
    expect(CHAPTERS.flatMap((c) => c.lines)).toEqual(SCRIPT.map((s) => s.id))
  })
  it('a chapter with a switch says what to flip', () => {
    for (const c of CHAPTERS) if (c.toggle) expect(c.flip).toBeTruthy()
  })
})

describe('guide', () => {
  it('runs off, asks for the flip, runs on, then is done', () => {
    let s: GuideState = guide(START, { type: 'goto', chapter: barge }, ALL_OFF)
    expect(s).toEqual({ chapter: barge, phase: 'before', line: 0 })
    expect(currentLine(s)).toBe('exam')
    s = guide(s, { type: 'said', stepId: 'exam' }, ALL_OFF)
    s = guide(s, { type: 'said', stepId: 'cut-in' }, ALL_OFF)
    expect(s.phase).toBe('flip')
    expect(currentLine(s)).toBeNull()
    const on = { ...ALL_OFF, bargeIn: true }
    s = guide(s, { type: 'toggled', name: 'bargeIn', on: true }, on)
    expect(s).toMatchObject({ phase: 'after', line: 0 })
    s = guide(s, { type: 'said', stepId: 'exam' }, on)
    s = guide(s, { type: 'said', stepId: 'cut-in' }, on)
    expect(s.phase).toBe('done')
  })

  it('turning the switch back off starts the before run again', () => {
    const s = guide({ chapter: barge, phase: 'done', line: 2 }, { type: 'toggled', name: 'bargeIn', on: false }, ALL_OFF)
    expect(s).toEqual({ chapter: barge, phase: 'before', line: 0 })
  })

  it('ignores switches that belong to another chapter', () => {
    const s: GuideState = { chapter: barge, phase: 'before', line: 1 }
    expect(guide(s, { type: 'toggled', name: 'keyterms', on: true }, ALL_OFF)).toBe(s)
  })

  it('asking the long question again restarts from there', () => {
    const s = guide({ chapter: barge, phase: 'before', line: 1 }, { type: 'said', stepId: 'exam' }, ALL_OFF)
    expect(s.line).toBe(1)
  })

  it('a chapter without a switch goes straight to done', () => {
    let s = guide(START, { type: 'said', stepId: 'adopted' }, ALL_OFF)
    s = guide(s, { type: 'said', stepId: 'otto' }, ALL_OFF)
    expect(s.phase).toBe('done')
  })

  it('skip moves a live call on when detection missed a line', () => {
    expect(guide(START, { type: 'skip' }, ALL_OFF).line).toBe(1)
  })
})
