import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useQuizStore } from '@/stores/quiz.store'
import { useNetworkStore } from '@/stores/network.store'
import { createTestPinia } from '@/test/helpers'
import type { GameSnapshot } from '@/net/protocol'

type Handlers = {
	onOpen: () => void
	onData: (data: unknown, peerId: string) => void
	onViewerJoin?: (peerId: string) => void
	onViewerLeave?: (peerId: string) => void
	onClose?: () => void
	onError?: (message: string) => void
}

const mocks = vi.hoisted(() => ({
	createHostTransport: vi.fn(),
	createClientTransport: vi.fn(),
	generateRoomCode: vi.fn(() => 'ABCDEF')
}))

vi.mock('@/net/transport', () => ({
	createHostTransport: mocks.createHostTransport,
	createClientTransport: mocks.createClientTransport,
	generateRoomCode: mocks.generateRoomCode
}))

let sent: unknown[]
let closeSpy: ReturnType<typeof vi.fn>
let hostHandlers: Handlers | null
let clientHandlers: Handlers | null

const makeTransport = () => ({
	send: (data: unknown) => sent.push(data),
	broadcast: (data: unknown) => sent.push(data),
	close: closeSpy
})

const isState = (message: unknown) => (message as { type?: string }).type === 'state'
const findMessage = (type: string) =>
	sent.find(message => (message as { type?: string }).type === type)

const remoteSnapshot: GameSnapshot = {
	v: 1,
	themes: [
		{
			id: 't1',
			themeText: 'Remote',
			questions: [{ points: 100 }]
		}
	],
	players: [{ id: 'p1', name: 'Anna', score: 5 }],
	answeredBy: [['t1:100', 'Anna']],
	openCard: { themeId: 't1', points: 100 },
	answerRevealed: true
}

describe('network store', () => {
	let quiz: ReturnType<typeof useQuizStore>
	let network: ReturnType<typeof useNetworkStore>

	beforeEach(() => {
		createTestPinia()
		quiz = useQuizStore()
		network = useNetworkStore()
		vi.clearAllMocks()
		sent = []
		closeSpy = vi.fn()
		hostHandlers = null
		clientHandlers = null
		mocks.generateRoomCode.mockReturnValue('ABCDEF')
		mocks.createHostTransport.mockImplementation((_code: string, handlers: Handlers) => {
			hostHandlers = handlers
			return makeTransport()
		})
		mocks.createClientTransport.mockImplementation((_code: string, handlers: Handlers) => {
			clientHandlers = handlers
			return makeTransport()
		})
	})

	describe('hosting', () => {
		it('starts a session with a generated room code', () => {
			network.startHosting()

			expect(mocks.createHostTransport).toHaveBeenCalledWith('ABCDEF', expect.anything())
			expect(network.role).toBe('host')
			expect(network.status).toBe('connecting')
			expect(network.roomCode).toBe('ABCDEF')

			hostHandlers!.onOpen()

			expect(network.status).toBe('connected')
		})

		it('broadcasts a snapshot whenever the quiz changes', async () => {
			network.startHosting()
			hostHandlers!.onOpen()
			sent = []

			quiz.addColumn()
			await nextTick()

			expect(sent.some(isState)).toBe(true)
			const state = findMessage('state') as { snapshot: GameSnapshot }
			expect(state.snapshot.themes).toHaveLength(1)
		})

		it('ships the card content only when a card is opened', async () => {
			quiz.addColumn()
			const themeId = quiz.themes[0].id
			quiz.updateQuestionFull(themeId, 100, {
				points: 100,
				question: 'q',
				answer: 'a',
				image: 'data:image/png;base64,AAAA'
			})
			network.startHosting()
			hostHandlers!.onOpen()
			sent = []

			quiz.openQuestion(themeId, 100)
			await nextTick()

			const card = findMessage('card') as {
				card: { question: string; image?: string; answer?: string }
			}
			expect(card).toBeDefined()
			expect(card.card.question).toBe('q')
			expect(card.card.image).toBe('data:image/png;base64,AAAA')
			expect(card.card.answer).toBeUndefined()

			// The board snapshot never carries question content.
			const state = findMessage('state') as { snapshot: GameSnapshot }
			expect(state.snapshot.themes[0].questions[0]).toEqual({ points: 100 })
		})

		it('ships the answer only once it is revealed and hides it again', async () => {
			quiz.addColumn()
			const themeId = quiz.themes[0].id
			quiz.updateQuestionFull(themeId, 100, { points: 100, question: 'q', answer: 'a' })
			network.startHosting()
			hostHandlers!.onOpen()
			quiz.openQuestion(themeId, 100)
			await nextTick()
			sent = []

			quiz.setAnswerRevealed(true)
			await nextTick()

			const reveal = sent.find(
				message => (message as { type?: string }).type === 'answer'
			) as { answer: { answer: string | null } }
			expect(reveal).toBeDefined()
			expect(reveal.answer.answer).toBe('a')

			sent = []
			quiz.setAnswerRevealed(false)
			await nextTick()

			const hide = sent.find(
				message => (message as { type?: string }).type === 'answer'
			) as { answer: { answer: string | null } }
			expect(hide).toBeDefined()
			expect(hide.answer.answer).toBeNull()
		})

		it('resends the open card when a viewer joins', async () => {
			quiz.addColumn()
			const themeId = quiz.themes[0].id
			quiz.updateQuestionFull(themeId, 100, { points: 100, question: 'q', answer: 'a' })
			network.startHosting()
			hostHandlers!.onOpen()
			quiz.openQuestion(themeId, 100)
			quiz.setAnswerRevealed(true)
			await nextTick()
			sent = []

			hostHandlers!.onViewerJoin?.('viewer-1')

			const card = findMessage('card') as { card: { question: string; answer?: string } }
			expect(card.card.question).toBe('q')
			expect(card.card.answer).toBe('a')
			expect(findMessage('state')).toBeDefined()
		})

		it('tracks viewers and resends the state when one joins', () => {
			network.startHosting()
			hostHandlers!.onOpen()
			sent = []

			hostHandlers!.onViewerJoin?.('viewer-1')

			expect(network.viewerCount).toBe(1)
			expect(sent.some(isState)).toBe(true)

			hostHandlers!.onViewerLeave?.('viewer-1')
			expect(network.viewerCount).toBe(0)
		})

		it('ignores payloads sent by viewers', () => {
			network.startHosting()
			hostHandlers!.onOpen()

			hostHandlers!.onData({ type: 'state', snapshot: remoteSnapshot }, 'viewer-1')

			expect(quiz.themes).toHaveLength(0)
		})

		it('ignores events from a previous session after leaving', () => {
			network.startHosting()
			const handlers = hostHandlers!
			handlers.onOpen()

			network.leave()
			handlers.onViewerJoin?.('viewer-1')

			expect(network.viewerCount).toBe(0)
			expect(network.role).toBe('offline')
		})

		it('surfaces transport errors', () => {
			network.startHosting()
			hostHandlers!.onError?.('kaputt')

			expect(network.status).toBe('error')
			expect(network.error).toBe('kaputt')
		})
	})

	describe('joining', () => {
		it('joins with a normalized code and switches to play mode', () => {
			quiz.setEditMode(true)
			network.join(' ab12cd ')

			expect(network.role).toBe('client')
			expect(network.roomCode).toBe('AB12CD')
			expect(quiz.isEditMode).toBe(false)
			expect(mocks.createClientTransport).toHaveBeenCalledWith('AB12CD', expect.anything())

			clientHandlers!.onOpen()

			expect(network.status).toBe('connected')
			expect(sent).toContainEqual({ type: 'hello' })
		})

		it('rejects an empty code', () => {
			network.join('   ')

			expect(network.status).toBe('error')
			expect(network.error).toBe('Bitte einen Raumcode eingeben.')
			expect(mocks.createClientTransport).not.toHaveBeenCalled()
		})

		it('applies incoming state snapshots to the quiz store', () => {
			network.join('AB12CD')
			clientHandlers!.onOpen()

			clientHandlers!.onData({ type: 'state', snapshot: remoteSnapshot }, '')

			expect(quiz.themes[0].themeText).toBe('Remote')
			expect(quiz.themes[0].questions[0]).toEqual({ points: 100, question: '', answer: '' })
			expect(quiz.players[0].score).toBe(5)
			expect(quiz.getAnsweredBy('t1', 100)).toBe('Anna')
			expect(quiz.openCard).toEqual({ themeId: 't1', points: 100 })
			expect(quiz.answerRevealed).toBe(true)
		})

		it('applies card content and the answer shipped by the host', () => {
			network.join('AB12CD')
			clientHandlers!.onOpen()
			clientHandlers!.onData({ type: 'state', snapshot: remoteSnapshot }, '')

			clientHandlers!.onData(
				{
					type: 'card',
					card: {
						themeId: 't1',
						points: 100,
						question: 'q',
						image: 'data:image/png;base64,AAAA'
					}
				},
				''
			)
			clientHandlers!.onData(
				{ type: 'answer', answer: { themeId: 't1', points: 100, answer: 'a' } },
				''
			)

			const question = quiz.themes[0].questions[0]
			expect(question.question).toBe('q')
			expect(question.image).toBe('data:image/png;base64,AAAA')
			expect(question.answer).toBe('a')
		})

		it('ignores malformed messages', () => {
			network.join('AB12CD')
			clientHandlers!.onOpen()

			clientHandlers!.onData({ type: 'state' }, '')
			clientHandlers!.onData('garbage', '')
			clientHandlers!.onData(null, '')

			expect(quiz.themes).toHaveLength(0)
		})

		it('reports a dropped connection', () => {
			network.join('AB12CD')
			clientHandlers!.onOpen()

			clientHandlers!.onClose?.()

			expect(network.status).toBe('idle')
			expect(network.error).toBe('Verbindung zum Host beendet.')
		})
	})

	describe('leaving', () => {
		it('closes the transport and resets all state', () => {
			network.startHosting()
			hostHandlers!.onOpen()

			network.leave()

			expect(closeSpy).toHaveBeenCalledTimes(1)
			expect(network.role).toBe('offline')
			expect(network.status).toBe('idle')
			expect(network.roomCode).toBeNull()
			expect(network.viewerCount).toBe(0)
		})
	})
})
