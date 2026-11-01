import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { GameSnapshot } from '@/net/protocol'
import { createViewerSync, type ViewerSync } from '@/net/viewerSync'
import { useQuizStore } from '@/stores/quiz.store'

const snapshot = (overrides: Partial<GameSnapshot> = {}): GameSnapshot => ({
  v: 2,
  themes: [
    {
      id: 't1',
      themeText: 'Remote',
      questions: [{ points: 100 }],
    },
  ],
  players: [{ id: 'p1', name: 'Anna', score: 5 }],
  answeredBy: [],
  openCard: null,
  answerRevealed: false,
  ...overrides,
})

describe('viewer sync', () => {
  let store: ReturnType<typeof useQuizStore>
  let sync: ViewerSync

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useQuizStore()
    sync = createViewerSync(store)
  })

  describe('applySnapshot', () => {
    it('replaces the local state', () => {
      sync.applySnapshot(
        snapshot({ answeredBy: [['t1:100', 'Anna']], openCard: { themeId: 't1', points: 100 } }),
      )

      expect(store.themes).toHaveLength(1)
      expect(store.themes[0].themeText).toBe('Remote')
      expect(store.themes[0].questions[0].question).toBe('')
      expect(store.players[0].name).toBe('Anna')
      expect(store.getAnsweredBy('t1', 100)).toBe('Anna')
      expect(store.openCard).toEqual({ themeId: 't1', points: 100 })
    })

    it('keeps the open card content across later snapshots', () => {
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
      sync.applyCard({
        themeId: 't1',
        points: 100,
        question: 'q',
        answer: 'a',
        image: 'data:image/png;base64,AAAA',
      })

      // A later snapshot must not drop the currently open card's content.
      sync.applySnapshot(
        snapshot({ openCard: { themeId: 't1', points: 100 }, answerRevealed: true }),
      )

      const question = store.themes[0].questions[0]
      expect(question.question).toBe('q')
      expect(question.answer).toBe('a')
      expect(question.image).toBe('data:image/png;base64,AAAA')
    })

    it('drops the open card content when the card is closed', () => {
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
      sync.applyCard({ themeId: 't1', points: 100, question: 'q', answer: 'a' })

      sync.applySnapshot(snapshot({ openCard: null }))
      expect(store.themes[0].questions[0].question).toBe('')

      // Reopening without a fresh card payload stays empty.
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
      expect(store.themes[0].questions[0].question).toBe('')
      expect(store.themes[0].questions[0].answer).toBe('')
    })

    it('does not surface the answer while it is hidden', () => {
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
      sync.applyCard({ themeId: 't1', points: 100, question: 'q', answer: 'a' })

      expect(store.themes[0].questions[0].answer).toBe('')
    })
  })

  describe('applyCard', () => {
    it('fills the open card with question and media', () => {
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))

      sync.applyCard({
        themeId: 't1',
        points: 100,
        question: 'q',
        audio: 'data:audio/mpeg:base64,BBBB',
      })

      const question = store.themes[0].questions[0]
      expect(question.question).toBe('q')
      expect(question.audio).toBe('data:audio/mpeg:base64,BBBB')
      expect(question.answer).toBe('')
    })

    it('ignores media of unknown cards', () => {
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))

      sync.applyCard({ themeId: 'missing', points: 100, question: 'other' })

      expect(store.themes[0].questions[0].question).toBe('')
    })
  })

  describe('applyAnswer', () => {
    it('reveals and hides the answer of the open card', () => {
      sync.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
      sync.applyCard({ themeId: 't1', points: 100, question: 'q' })

      sync.applyAnswer({ themeId: 't1', points: 100, answer: 'a' })
      expect(store.themes[0].questions[0].answer).toBe('a')

      sync.applyAnswer({ themeId: 't1', points: 100, answer: null })
      expect(store.themes[0].questions[0].answer).toBe('')
    })

    it('ignores answers for a card that is not open', () => {
      sync.applySnapshot(snapshot({ openCard: null }))

      sync.applyAnswer({ themeId: 't1', points: 100, answer: 'a' })

      expect(store.themes[0].questions[0].answer).toBe('')
    })
  })
})
