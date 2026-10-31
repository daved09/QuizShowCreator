import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQuizStore } from '@/stores/quiz.store'
import type { GameSnapshot } from '@/net/protocol'

const snapshot = (overrides: Partial<GameSnapshot> = {}): GameSnapshot => ({
	v: 2,
	themes: [
		{
			id: 't1',
			themeText: 'Remote',
			questions: [{ points: 100 }]
		}
	],
	players: [{ id: 'p1', name: 'Anna', score: 5 }],
	answeredBy: [],
	openCard: null,
	answerRevealed: false,
	...overrides
})

describe('quiz store snapshot handling', () => {
	let store: ReturnType<typeof useQuizStore>

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useQuizStore()
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

	describe('toSnapshot', () => {
		it('captures the board state without any question content', () => {
			store.addColumn()
			store.addPlayer('Anna')
			const themeId = store.themes[0].id
			store.updateQuestionFull(themeId, 100, { points: 100, question: 'q', answer: 'a' })
			store.awardPointsForCard(store.players[0].id, themeId, 100)
			store.openQuestion(themeId, 100)

			const snap = store.toSnapshot()

			expect(snap.openCard).toEqual({ themeId, points: 100 })
			expect(snap.players).toEqual([{ id: store.players[0].id, name: 'Anna', score: 100 }])
			expect(snap.answeredBy).toEqual([[`${themeId}:100`, 'Anna']])
			expect(snap.themes[0].questions[0]).toEqual({ points: 100 })
		})
	})

	describe('applySnapshot', () => {
		it('replaces the local state', () => {
			store.applySnapshot(
				snapshot({ answeredBy: [['t1:100', 'Anna']], openCard: { themeId: 't1', points: 100 } })
			)

			expect(store.themes).toHaveLength(1)
			expect(store.themes[0].themeText).toBe('Remote')
			expect(store.themes[0].questions[0].question).toBe('')
			expect(store.players[0].name).toBe('Anna')
			expect(store.getAnsweredBy('t1', 100)).toBe('Anna')
			expect(store.openCard).toEqual({ themeId: 't1', points: 100 })
		})

		it('keeps the open card content across later snapshots', () => {
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
			store.applyCard({
				themeId: 't1',
				points: 100,
				question: 'q',
				answer: 'a',
				image: 'data:image/png;base64,AAAA'
			})

			// A later snapshot must not drop the currently open card's content.
			store.applySnapshot(
				snapshot({ openCard: { themeId: 't1', points: 100 }, answerRevealed: true })
			)

			const question = store.themes[0].questions[0]
			expect(question.question).toBe('q')
			expect(question.answer).toBe('a')
			expect(question.image).toBe('data:image/png;base64,AAAA')
		})

		it('drops the open card content when the card is closed', () => {
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
			store.applyCard({ themeId: 't1', points: 100, question: 'q', answer: 'a' })

			store.applySnapshot(snapshot({ openCard: null }))
			expect(store.themes[0].questions[0].question).toBe('')

			// Reopening without a fresh card payload stays empty.
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
			expect(store.themes[0].questions[0].question).toBe('')
			expect(store.themes[0].questions[0].answer).toBe('')
		})

		it('does not surface the answer while it is hidden', () => {
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
			store.applyCard({ themeId: 't1', points: 100, question: 'q', answer: 'a' })

			expect(store.themes[0].questions[0].answer).toBe('')
		})
	})

	describe('applyCard', () => {
		it('fills the open card with question and media', () => {
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))

			store.applyCard({
				themeId: 't1',
				points: 100,
				question: 'q',
				audio: 'data:audio/mpeg:base64,BBBB'
			})

			const question = store.themes[0].questions[0]
			expect(question.question).toBe('q')
			expect(question.audio).toBe('data:audio/mpeg:base64,BBBB')
			expect(question.answer).toBe('')
		})

		it('ignores media of unknown cards', () => {
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))

			store.applyCard({ themeId: 'missing', points: 100, question: 'other' })

			expect(store.themes[0].questions[0].question).toBe('')
		})
	})

	describe('applyAnswer', () => {
		it('reveals and hides the answer of the open card', () => {
			store.applySnapshot(snapshot({ openCard: { themeId: 't1', points: 100 } }))
			store.applyCard({ themeId: 't1', points: 100, question: 'q' })

			store.applyAnswer({ themeId: 't1', points: 100, answer: 'a' })
			expect(store.themes[0].questions[0].answer).toBe('a')

			store.applyAnswer({ themeId: 't1', points: 100, answer: null })
			expect(store.themes[0].questions[0].answer).toBe('')
		})

		it('ignores answers for a card that is not open', () => {
			store.applySnapshot(snapshot({ openCard: null }))

			store.applyAnswer({ themeId: 't1', points: 100, answer: 'a' })

			expect(store.themes[0].questions[0].answer).toBe('')
		})
	})
})
