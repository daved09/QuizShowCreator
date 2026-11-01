import { describe, expect, it } from 'vitest'
import {
  PROTOCOL_VERSION,
  createSnapshot,
  isGameSnapshot,
  parseMessage,
  type GameSnapshot,
} from '@/net/protocol'
import type { Player, Theme } from '@/stores/quiz.store'

const themes: Theme[] = [
  {
    id: 't1',
    themeText: 'Geografie',
    questions: [
      {
        points: 100,
        question: 'Hauptstadt von Frankreich?',
        answer: 'Paris',
        image: 'data:image/png;base64,AAAA',
        audio: 'data:audio/mpeg;base64,BBBB',
      },
      { points: 200, question: 'Fluss?', answer: 'Rhein' },
    ],
  },
]

const players: Player[] = [{ id: 'p1', name: 'Anna', score: 100 }]

describe('createSnapshot', () => {
  it('ships only board metadata and never question content', () => {
    const snapshot = createSnapshot({
      themes,
      players,
      answeredBy: new Map([['t1:100', 'Anna']]),
      openCard: { themeId: 't1', points: 100 },
      answerRevealed: true,
    })

    expect(snapshot.v).toBe(PROTOCOL_VERSION)
    expect(snapshot.themes).toEqual([
      {
        id: 't1',
        themeText: 'Geografie',
        questions: [{ points: 100 }, { points: 200 }],
      },
    ])
    const question = snapshot.themes[0].questions[0] as Record<string, unknown>
    expect('question' in question).toBe(false)
    expect('answer' in question).toBe(false)
    expect('image' in question).toBe(false)
    expect('audio' in question).toBe(false)
  })

  it('converts the answeredBy map into plain entries', () => {
    const snapshot = createSnapshot({
      themes,
      players,
      answeredBy: new Map([
        ['t1:100', 'Anna'],
        ['t1:200', 'Bob'],
      ]),
      openCard: null,
      answerRevealed: false,
    })

    expect(snapshot.answeredBy).toEqual([
      ['t1:100', 'Anna'],
      ['t1:200', 'Bob'],
    ])
    expect(snapshot.openCard).toBeNull()
  })

  it('copies the open card so later mutations do not leak', () => {
    const openCard = { themeId: 't1', points: 100 }
    const snapshot = createSnapshot({
      themes,
      players,
      answeredBy: new Map(),
      openCard,
      answerRevealed: false,
    })

    expect(snapshot.openCard).not.toBe(openCard)
    expect(snapshot.openCard).toEqual(openCard)
  })
})

describe('isGameSnapshot', () => {
  const valid = createSnapshot({
    themes,
    players,
    answeredBy: new Map(),
    openCard: null,
    answerRevealed: false,
  })

  it('accepts a well-formed snapshot', () => {
    expect(isGameSnapshot(valid)).toBe(true)
  })

  it.each([
    ['null', null],
    ['missing version', { ...valid, v: undefined }],
    ['non-array themes', { ...valid, themes: 'nope' }],
    ['non-array players', { ...valid, players: {} }],
    ['bad answeredBy entry', { ...valid, answeredBy: [['only-one']] }],
    ['bad openCard', { ...valid, openCard: { themeId: 1, points: 100 } }],
    ['bad question', { ...valid, themes: [{ id: 't', themeText: 'x', questions: [{}] }] }],
  ])('rejects %s', (_label, value) => {
    expect(isGameSnapshot(value)).toBe(false)
  })
})

describe('parseMessage', () => {
  const snapshot = createSnapshot({
    themes,
    players,
    answeredBy: new Map(),
    openCard: null,
    answerRevealed: false,
  })

  it('accepts a state message', () => {
    expect(parseMessage({ type: 'state', snapshot })).toEqual({ type: 'state', snapshot })
  })

  it('parses a JSON string payload', () => {
    expect(parseMessage(JSON.stringify({ type: 'state', snapshot }))).toEqual({
      type: 'state',
      snapshot,
    })
  })

  it('accepts a hello message with and without a name', () => {
    expect(parseMessage({ type: 'hello', name: 'Anna' })).toEqual({ type: 'hello', name: 'Anna' })
    expect(parseMessage({ type: 'hello' })).toEqual({ type: 'hello', name: undefined })
  })

  it('accepts a card message', () => {
    const card = {
      themeId: 't1',
      points: 100,
      question: 'Hauptstadt von Frankreich?',
      image: 'data:image/png;base64,AAAA',
    }
    expect(parseMessage({ type: 'card', card })).toEqual({ type: 'card', card })
  })

  it('accepts an answer message with and without a value', () => {
    const revealed = { themeId: 't1', points: 100, answer: 'Paris' }
    const hidden = { themeId: 't1', points: 100, answer: null }
    expect(parseMessage({ type: 'answer', answer: revealed })).toEqual({
      type: 'answer',
      answer: revealed,
    })
    expect(parseMessage({ type: 'answer', answer: hidden })).toEqual({
      type: 'answer',
      answer: hidden,
    })
  })

  it.each([
    ['a string', 'not json'],
    ['null', null],
    ['a number', 42],
    ['an unknown type', { type: 'nope' }],
    ['a state without a snapshot', { type: 'state' }],
    ['a state with a bad snapshot', { type: 'state', snapshot: { v: 1 } }],
    ['a card without a payload', { type: 'card' }],
    ['a card payload missing fields', { type: 'card', card: { points: 1 } }],
    ['an answer without a payload', { type: 'answer' }],
    ['an answer payload missing fields', { type: 'answer', answer: { points: 1 } }],
  ])('rejects %s', (_label, value) => {
    expect(parseMessage(value)).toBeNull()
  })
})

describe('snapshot round trip', () => {
  it('survives serialization unchanged', () => {
    const snapshot: GameSnapshot = createSnapshot({
      themes,
      players,
      answeredBy: new Map([['t1:100', 'Anna']]),
      openCard: { themeId: 't1', points: 100 },
      answerRevealed: true,
    })

    const message = parseMessage(JSON.parse(JSON.stringify({ type: 'state', snapshot })))
    expect(message).toEqual({ type: 'state', snapshot })
  })
})
