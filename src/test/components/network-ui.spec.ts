import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
import LobbyModal from '@/components/LobbyModal.vue'
import QuestionModal from '@/components/QuestionModal.vue'
import { useQuizStore } from '@/stores/quiz.store'
import { useNetworkStore } from '@/stores/network.store'
import { createTestPinia } from '@/test/helpers'

const mocks = vi.hoisted(() => ({
	createHostTransport: vi.fn(() => ({ send: vi.fn(), broadcast: vi.fn(), close: vi.fn() })),
	createClientTransport: vi.fn(() => ({ send: vi.fn(), broadcast: vi.fn(), close: vi.fn() })),
	generateRoomCode: vi.fn(() => 'ABCDEF')
}))

vi.mock('@/net/transport', () => mocks)

const buttonByText = (wrapper: VueWrapper, text: string) =>
	wrapper.findAll('button').find(button => button.text() === text)!

describe('multiplayer UI', () => {
	let pinia: ReturnType<typeof createTestPinia>

	beforeEach(() => {
		pinia = createTestPinia()
		vi.clearAllMocks()
		mocks.generateRoomCode.mockReturnValue('ABCDEF')
	})

	describe('ConnectionStatus', () => {
		it('offers to open the lobby while offline', async () => {
			const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })

			const button = wrapper.find('button')
			expect(button.text()).toBe('Online spielen')

			await button.trigger('click')

			expect(wrapper.emitted('open-lobby')).toHaveLength(1)
		})

		it('shows the room code while hosting', () => {
			const network = useNetworkStore()
			network.startHosting()

			const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })

			expect(wrapper.text()).toContain('Host · ABCDEF')
			expect(buttonByText(wrapper, 'Beenden').exists()).toBe(true)
		})
	})

	describe('LobbyModal', () => {
		it('starts hosting and shows the room code', async () => {
			const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

			await buttonByText(wrapper, 'Spiel hosten').trigger('click')

			expect(mocks.createHostTransport).toHaveBeenCalledTimes(1)
			expect(wrapper.find('.room-code').text()).toBe('ABCDEF')
		})

		it('joins with a normalized room code', async () => {
			const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

			await wrapper.find('.code-input').setValue('ab12cd')
			await wrapper.find('.join-form').trigger('submit')

			expect(mocks.createClientTransport).toHaveBeenCalledWith('AB12CD', expect.anything())
		})

		it('closes via the backdrop', async () => {
			const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

			await wrapper.find('.modal-backdrop').trigger('click')

			expect(wrapper.emitted('close')).toHaveLength(1)
		})
	})

	describe('QuestionModal for viewers', () => {
		it('hides the point-awarding controls for viewers', () => {
			const quiz = useQuizStore()
			const network = useNetworkStore()
			network.join('AB12CD')
			quiz.addPlayer('Anna')

			const wrapper = mount(QuestionModal, {
				props: {
					mode: 'view' as const,
					themeText: 'Thema',
					question: { points: 100, question: 'Frage', answer: 'Antwort' },
					revealed: true
				},
				global: { plugins: [pinia] }
			})

			expect(wrapper.text()).toContain('Antwort')
			expect(wrapper.find('.award-section').exists()).toBe(false)
		})

		it('shows the point-awarding controls for the host', () => {
			const quiz = useQuizStore()
			quiz.addPlayer('Anna')

			const wrapper = mount(QuestionModal, {
				props: {
					mode: 'view' as const,
					themeText: 'Thema',
					question: { points: 100, question: 'Frage', answer: 'Antwort' },
					revealed: true
				},
				global: { plugins: [pinia] }
			})

			expect(wrapper.find('.award-section').exists()).toBe(true)
		})
	})
})
