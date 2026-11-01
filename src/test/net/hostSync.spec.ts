import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createCardPayload, getCardAnswer } from '@/net/hostSync'
import { createSnapshot } from '@/net/protocol'
import { useQuizStore } from '@/stores/quiz.store'

describe('host sync', () => {
  let store: ReturnType<typeof useQuizStore>
  let themeId: string

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useQuizStore()
    store.addColumn()
    themeId = store.themes[0].id
    store.updateQuestionFull(themeId, 100, {
      points: 100,
      question: 'q',
      answer: 'a',
      image: 'data:image/png;base64,AAAA',
    })
  })

  describe('createCardPayload', () => {
    it('ships question and media but no answer while it is hidden', () => {
      expect(createCardPayload(store.themes, { themeId, points: 100 }, false)).toEqual({
        themeId,
        points: 100,
        question: 'q',
        image: 'data:image/png;base64,AAAA',
      })
    })

    it('includes the answer once it is revealed', () => {
      expect(createCardPayload(store.themes, { themeId, points: 100 }, true)?.answer).toBe('a')
    })

    it('returns null for unknown cards', () => {
      expect(createCardPayload(store.themes, { themeId: 'missing', points: 100 }, false)).toBeNull()
    })
  })

  describe('getCardAnswer', () => {
    it('returns the answer of a card, or null for unknown cards', () => {
      expect(getCardAnswer(store.themes, { themeId, points: 100 })).toBe('a')
      expect(getCardAnswer(store.themes, { themeId, points: 999 })).toBeNull()
    })
  })

  describe('createSnapshot from the store', () => {
    it('captures the board state without any question content', () => {
      store.addPlayer('Anna')
      store.awardPointsForCard(store.players[0].id, themeId, 100)
      store.openQuestion(themeId, 100)

      const snap = createSnapshot(store)

      expect(snap.openCard).toEqual({ themeId, points: 100 })
      expect(snap.players).toEqual([{ id: store.players[0].id, name: 'Anna', score: 100 }])
      expect(snap.answeredBy).toEqual([[`${themeId}:100`, 'Anna']])
      expect(snap.themes[0].questions[0]).toEqual({ points: 100 })
    })
  })
})
