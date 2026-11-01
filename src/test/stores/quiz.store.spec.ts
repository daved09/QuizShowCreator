import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_POINTS } from '@/constants'
import { QUIZ_FILE_VERSION, type QuizFile } from '@/quiz/quizFile'
import { useQuizStore } from '@/stores/quiz.store'

describe('quiz store', () => {
  let store: ReturnType<typeof useQuizStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useQuizStore()
  })

  describe('Themes / columns', () => {
    it('creates a theme with default points via addColumn', () => {
      store.addColumn()

      expect(store.themes).toHaveLength(1)
      const theme = store.themes[0]
      expect(typeof theme.id).toBe('string')
      expect(theme.id.length).toBeGreaterThan(0)
      expect(theme.themeText).toBe('New Theme')
      expect(theme.questions.map((q) => q.points)).toEqual(DEFAULT_POINTS)
      expect(theme.questions.every((q) => q.question === '' && q.answer === '')).toBe(true)
    })

    it('assigns unique IDs for multiple themes', () => {
      store.addColumn()
      store.addColumn()
      expect(store.themes[0].id).not.toBe(store.themes[1].id)
    })

    it('removes a theme by its ID', () => {
      store.addColumn()
      store.addColumn()
      const [first, second] = store.themes

      store.removeTheme(first.id)

      expect(store.themes).toHaveLength(1)
      expect(store.themes[0].id).toBe(second.id)
    })

    it('updates the theme text and ignores unknown IDs', () => {
      store.addColumn()
      const id = store.themes[0].id

      store.updateThemeText(id, 'Geografie')
      expect(store.themes[0].themeText).toBe('Geografie')

      expect(() => store.updateThemeText('does-not-exist', 'X')).not.toThrow()
      expect(store.themes[0].themeText).toBe('Geografie')
    })
  })

  describe('updateQuestionContent', () => {
    beforeEach(() => {
      store.addColumn()
    })

    it('updates question, answer and image but keeps the points', () => {
      const id = store.themes[0].id

      const ok = store.updateQuestionContent(id, 100, {
        question: 'Frage',
        answer: 'Antwort',
        image: 'data:image/png;base64,AAAA',
      })

      expect(ok).toBe(true)
      expect(store.themes[0].questions.map((q) => q.points)).toEqual(DEFAULT_POINTS)
      expect(store.themes[0].questions[0]).toEqual({
        points: 100,
        question: 'Frage',
        answer: 'Antwort',
        image: 'data:image/png;base64,AAAA',
      })
    })

    it('removes the image when none is passed', () => {
      const id = store.themes[0].id
      store.updateQuestionContent(id, 100, {
        question: 'q',
        answer: 'a',
        image: 'data:image/png;base64,AAAA',
      })

      store.updateQuestionContent(id, 100, { question: 'q', answer: 'a' })

      expect(store.themes[0].questions[0].image).toBeUndefined()
    })

    it('sets and removes audio like the image', () => {
      const id = store.themes[0].id

      store.updateQuestionContent(id, 100, {
        question: 'q',
        answer: 'a',
        audio: 'data:audio/mpeg;base64,AAAA',
      })
      expect(store.themes[0].questions[0].audio).toBe('data:audio/mpeg;base64,AAAA')

      store.updateQuestionContent(id, 100, { question: 'q', answer: 'a' })
      expect(store.themes[0].questions[0].audio).toBeUndefined()
    })

    it('returns false for an unknown theme or point value', () => {
      expect(store.updateQuestionContent('missing', 100, { question: '', answer: '' })).toBe(false)
      expect(
        store.updateQuestionContent(store.themes[0].id, 1234, { question: '', answer: '' }),
      ).toBe(false)
    })
  })

  describe('Players', () => {
    it('assigns automatic names when none is given', () => {
      store.addPlayer()
      store.addPlayer('   ')

      expect(store.players.map((p) => p.name)).toEqual(['Spieler 1', 'Spieler 2'])
      expect(store.players.every((p) => p.score === 0)).toBe(true)
    })

    it('trims given names', () => {
      store.addPlayer('  Anna  ')
      expect(store.players[0].name).toBe('Anna')
    })

    it('cuts names to the maximum length when adding and renaming', () => {
      store.addPlayer('Maximiliane Mustermann')
      expect(store.players[0].name).toBe('Maximilian')

      store.renamePlayer(store.players[0].id, 'Bartholomäus')
      expect(store.players[0].name).toBe('Bartholomä')
    })

    it('derives default names from the current player count', () => {
      store.addPlayer('Anna')
      store.addPlayer()
      expect(store.players[1].name).toBe('Spieler 2')
    })

    it('removes a player by its ID', () => {
      store.addPlayer('Anna')
      store.addPlayer('Bob')

      store.removePlayer(store.players[0].id)

      expect(store.players.map((p) => p.name)).toEqual(['Bob'])
    })

    it('renames and keeps the name for an empty draft', () => {
      store.addPlayer('Anna')
      const id = store.players[0].id

      store.renamePlayer(id, '  Alice  ')
      expect(store.players[0].name).toBe('Alice')

      store.renamePlayer(id, '   ')
      expect(store.players[0].name).toBe('Alice')
    })

    it('does nothing for an unknown player ID', () => {
      expect(() => store.renamePlayer('missing', 'X')).not.toThrow()
    })
  })

  describe('Awarding points', () => {
    it('credits points and remembers who answered', () => {
      store.addColumn()
      store.addPlayer('Anna')
      const themeId = store.themes[0].id
      const playerId = store.players[0].id

      const ok = store.awardPointsForCard(playerId, themeId, 300)

      expect(ok).toBe(true)
      expect(store.players[0].score).toBe(300)
      expect(store.isAnswered(themeId, 300)).toBe(true)
      expect(store.getAnsweredBy(themeId, 300)).toBe('Anna')
    })

    it('returns false for an unknown player', () => {
      store.addColumn()
      const themeId = store.themes[0].id

      expect(store.awardPointsForCard('missing', themeId, 100)).toBe(false)
      expect(store.isAnswered(themeId, 100)).toBe(false)
    })

    it('returns null for unanswered cards', () => {
      expect(store.getAnsweredBy('theme', 100)).toBeNull()
      expect(store.isAnswered('theme', 100)).toBe(false)
    })

    it('allows awarding the same card multiple times', () => {
      store.addColumn()
      store.addPlayer('Anna')
      const themeId = store.themes[0].id
      const playerId = store.players[0].id

      store.awardPointsForCard(playerId, themeId, 200)
      store.awardPointsForCard(playerId, themeId, 200)

      expect(store.players[0].score).toBe(400)
    })
  })

  describe('resetRound', () => {
    it('resets all points and makes the cards available again', () => {
      store.addColumn()
      store.addPlayer('Anna')
      const themeId = store.themes[0].id
      const playerId = store.players[0].id
      store.awardPointsForCard(playerId, themeId, 500)

      store.resetRound()

      expect(store.players[0].score).toBe(0)
      expect(store.isAnswered(themeId, 500)).toBe(false)
      expect(store.getAnsweredBy(themeId, 500)).toBeNull()
    })
  })

  describe('Edit mode', () => {
    it('starts in edit mode and can be toggled', () => {
      expect(store.isEditMode).toBe(true)

      store.setEditMode(false)
      expect(store.isEditMode).toBe(false)

      store.toggleEditMode()
      expect(store.isEditMode).toBe(true)
    })

    it('closes a card opened while playing when entering edit mode', () => {
      store.addColumn()
      store.setEditMode(false)
      store.openQuestion(store.themes[0].id, 100)
      store.setAnswerRevealed(true)

      store.toggleEditMode()

      expect(store.openCard).toBeNull()
      expect(store.answerRevealed).toBe(false)
    })
  })

  describe('exportQuiz', () => {
    it('returns the expected file structure', () => {
      store.addColumn()
      store.addPlayer('Anna')

      const exported = store.exportQuiz()

      expect(exported.app).toBe('QuizShowCreator')
      expect(exported.version).toBe(QUIZ_FILE_VERSION)
      expect(exported.themes).toEqual(store.themes)
      expect(exported.players).toEqual(store.players)
    })
  })

  describe('importQuiz', () => {
    const validFile: QuizFile = {
      app: 'QuizShowCreator',
      version: QUIZ_FILE_VERSION,
      themes: [
        {
          id: 'ignored',
          themeText: 'Geografie',
          questions: [
            { points: 300, question: 'Drei', answer: 'c' },
            { points: 100, question: 'Eins', answer: 'a', image: 'data:image/png;base64,AAAA' },
          ],
        },
      ],
      players: [{ id: 'ignored', name: 'Anna', score: 50 }],
    }

    it('imports a valid file and sorts questions', () => {
      const result = store.importQuiz(validFile)

      expect(result).toEqual({ ok: true })
      expect(store.themes).toHaveLength(1)
      const theme = store.themes[0]
      expect(theme.themeText).toBe('Geografie')
      expect(typeof theme.id).toBe('string')
      expect(theme.id).not.toBe('ignored')
      expect(theme.questions.map((q) => q.points)).toEqual([100, 300])
      expect(theme.questions[0].image).toBe('data:image/png;base64,AAAA')
      expect(theme.questions[1].image).toBeUndefined()
      expect(store.players).toHaveLength(1)
      expect(store.players[0].name).toBe('Anna')
      expect(store.players[0].score).toBe(50)
    })

    it('resets the answered state on import', () => {
      store.addColumn()
      store.addPlayer('Anna')
      const themeId = store.themes[0].id
      store.awardPointsForCard(store.players[0].id, themeId, 100)
      expect(store.isAnswered(themeId, 100)).toBe(true)

      store.importQuiz(validFile)

      expect(store.themes[0].id).not.toBe(themeId)
      expect(store.isAnswered(store.themes[0].id, 100)).toBe(false)
    })

    it('accepts older files without players and without images', () => {
      const result = store.importQuiz({
        themes: [{ themeText: 'Alt', questions: [{ points: 100, question: 'q', answer: 'a' }] }],
      })

      expect(result).toEqual({ ok: true })
      expect(store.players).toEqual([])
      expect(store.themes[0].questions[0].image).toBeUndefined()
      expect(store.themes[0].questions[0].audio).toBeUndefined()
    })

    it.each([
      [null, 'Ungültiges Dateiformat.'],
      ['kein objekt', 'Ungültiges Dateiformat.'],
      [42, 'Ungültiges Dateiformat.'],
      [{}, 'Keine Themen in der Datei gefunden.'],
      [{ themes: 'nope' }, 'Keine Themen in der Datei gefunden.'],
      [{ themes: [null] }, 'Ungültiges Thema in der Datei.'],
      [{ themes: [{}] }, 'Ein Thema hat keinen gültigen Namen.'],
      [{ themes: [{ themeText: 'T' }] }, 'Ein Thema enthält keine gültigen Fragen.'],
      [{ themes: [{ themeText: 'T', questions: [null] }] }, 'Ungültige Frage in der Datei.'],
      [
        {
          themes: [{ themeText: 'T', questions: [{ points: '100', question: 'q', answer: 'a' }] }],
        },
        'Eine Frage hat eine ungültige Punktzahl.',
      ],
      [
        {
          themes: [
            { themeText: 'T', questions: [{ points: Number.NaN, question: 'q', answer: 'a' }] },
          ],
        },
        'Eine Frage hat eine ungültige Punktzahl.',
      ],
      [
        {
          themes: [
            { themeText: 'T', questions: [{ points: Infinity, question: 'q', answer: 'a' }] },
          ],
        },
        'Eine Frage hat eine ungültige Punktzahl.',
      ],
      [
        { themes: [{ themeText: 'T', questions: [{ points: 100, question: 5, answer: 'a' }] }] },
        'Eine Frage hat ungültigen Text.',
      ],
      [
        { themes: [{ themeText: 'T', questions: [{ points: 100, question: 'q', answer: null }] }] },
        'Eine Frage hat ungültigen Text.',
      ],
      [{ themes: [], players: 'nope' }, 'Ungültige Spielerliste in der Datei.'],
      [{ themes: [], players: [null] }, 'Ein Spieler in der Datei ist ungültig.'],
      [{ themes: [], players: [{ name: 123 }] }, 'Ein Spieler hat keinen gültigen Namen.'],
    ])('rejects invalid data: %j', (data, error) => {
      expect(store.importQuiz(data)).toEqual({ ok: false, error })
    })

    it('discards images that are not data:image URLs', () => {
      store.importQuiz({
        themes: [
          {
            themeText: 'T',
            questions: [{ points: 100, question: 'q', answer: 'a', image: 'https://evil/x.png' }],
          },
        ],
      })

      expect(store.themes[0].questions[0].image).toBeUndefined()
    })

    it('imports audio and discards non-data:audio URLs', () => {
      store.importQuiz({
        themes: [
          {
            themeText: 'T',
            questions: [
              { points: 100, question: 'q', answer: 'a', audio: 'data:audio/mpeg;base64,AAAA' },
              { points: 200, question: 'q', answer: 'a', audio: 'https://evil/x.mp3' },
            ],
          },
        ],
      })

      expect(store.themes[0].questions[0].audio).toBe('data:audio/mpeg;base64,AAAA')
      expect(store.themes[0].questions[1].audio).toBeUndefined()
    })

    it('uses 0 as a score fallback for an invalid player score', () => {
      store.importQuiz({
        themes: [],
        players: [{ name: 'Ohne' }, { name: 'Kaputt', score: 'viel' }],
      })

      expect(store.players.map((p) => p.score)).toEqual([0, 0])
    })

    it('does not modify existing data on a failed import', () => {
      store.addColumn()
      store.addPlayer('Anna')
      const before = {
        themes: store.themes,
        players: store.players,
      }

      const result = store.importQuiz({ themes: 'nope' })

      expect(result.ok).toBe(false)
      expect(store.themes).toBe(before.themes)
      expect(store.players).toBe(before.players)
      expect(store.themes).toHaveLength(1)
    })
  })

  describe('open/close question', () => {
    it('opens a card and hides the answer for unanswered cards', () => {
      store.addColumn()
      store.openQuestion(store.themes[0].id, 100)

      expect(store.openCard).toEqual({ themeId: store.themes[0].id, points: 100 })
      expect(store.answerRevealed).toBe(false)
    })

    it('reveals the answer immediately for already answered cards', () => {
      store.addColumn()
      store.addPlayer('Anna')
      const themeId = store.themes[0].id
      store.awardPointsForCard(store.players[0].id, themeId, 100)

      store.openQuestion(themeId, 100)

      expect(store.answerRevealed).toBe(true)
    })

    it('closes the card and resets the reveal flag', () => {
      store.addColumn()
      store.openQuestion(store.themes[0].id, 100)
      store.setAnswerRevealed(true)

      store.closeQuestion()

      expect(store.openCard).toBeNull()
      expect(store.answerRevealed).toBe(false)
    })
  })
})
