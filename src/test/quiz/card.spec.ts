import { describe, expect, it } from 'vitest'
import { cardKey, findQuestion, findTheme, isSameCard } from '@/quiz/card'
import type { Theme } from '@/types/quiz'

const themes: Theme[] = [
  {
    id: 't1',
    themeText: 'Geschichte',
    questions: [
      { points: 100, question: 'Q100', answer: 'A100' },
      { points: 200, question: 'Q200', answer: 'A200' },
    ],
  },
  { id: 't2', themeText: 'Sport', questions: [] },
]

describe('card helpers', () => {
  it('builds a key from theme ID and points', () => {
    expect(cardKey('t1', 200)).toBe('t1:200')
  })

  it('compares cards by theme ID and points', () => {
    expect(isSameCard({ themeId: 't1', points: 100 }, { themeId: 't1', points: 100 })).toBe(true)
    expect(isSameCard({ themeId: 't1', points: 100 }, { themeId: 't1', points: 200 })).toBe(false)
    expect(isSameCard({ themeId: 't1', points: 100 }, { themeId: 't2', points: 100 })).toBe(false)
    expect(isSameCard(null, { themeId: 't1', points: 100 })).toBe(false)
  })

  it('finds a theme by its ID', () => {
    expect(findTheme(themes, 't2')?.themeText).toBe('Sport')
    expect(findTheme(themes, 'missing')).toBeUndefined()
  })

  it('finds a question by theme ID and points', () => {
    expect(findQuestion(themes, 't1', 200)?.question).toBe('Q200')
    expect(findQuestion(themes, 't1', 300)).toBeUndefined()
    expect(findQuestion(themes, 'missing', 100)).toBeUndefined()
  })
})
