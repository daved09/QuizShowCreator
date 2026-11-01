import { describe, expect, it } from 'vitest'
import { createQuizFile, parseQuizFile, QUIZ_FILE_VERSION } from '@/quiz/quizFile'

describe('quiz file', () => {
  it('wraps themes and players with app name and version', () => {
    expect(createQuizFile([], [])).toEqual({
      app: 'QuizShowCreator',
      version: QUIZ_FILE_VERSION,
      themes: [],
      players: [],
    })
  })

  it('parses a valid file into sorted questions with fresh IDs', () => {
    const result = parseQuizFile({
      themes: [
        {
          id: 'old',
          themeText: 'Sport',
          questions: [
            { points: 200, question: 'b', answer: 'B' },
            { points: 100, question: 'a', answer: 'A', image: 'not-a-data-url' },
          ],
        },
      ],
      players: [{ name: 'Anna', score: 'x' }],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.themes[0].id).not.toBe('old')
    expect(result.themes[0].questions.map((q) => q.points)).toEqual([100, 200])
    expect(result.themes[0].questions[0].image).toBeUndefined()
    expect(result.players[0]).toMatchObject({ name: 'Anna', score: 0 })
  })

  it('reports the first problem as an error', () => {
    expect(parseQuizFile(null)).toEqual({ ok: false, error: 'Ungültiges Dateiformat.' })
    expect(parseQuizFile({ themes: [{ themeText: 1, questions: [] }] })).toEqual({
      ok: false,
      error: 'Ein Thema hat keinen gültigen Namen.',
    })
  })
})
