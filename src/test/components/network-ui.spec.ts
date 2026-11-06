import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
import LobbyModal from '@/components/LobbyModal.vue'
import QuestionModal from '@/components/QuestionModal.vue'
import { useQuizStore } from '@/stores/quiz.store'
import { useNetworkStore } from '@/stores/network.store'
import { createTestPinia } from '@/test/helpers'
import type { TransportHandlers } from '@/net/transport'

const mocks = vi.hoisted(() => ({
  createHostTransport: vi.fn(() => ({ send: vi.fn(), broadcast: vi.fn(), close: vi.fn() })),
  createClientTransport: vi.fn(() => ({ send: vi.fn(), broadcast: vi.fn(), close: vi.fn() })),
  generateRoomCode: vi.fn(() => 'ABCDEF'),
}))

vi.mock('@/net/transport', () => mocks)

const buttonByText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((button) => button.text() === text)!

type Handlers = TransportHandlers
const hostHandlers = (): Handlers =>
  (mocks.createHostTransport.mock.lastCall as unknown as [string, Handlers])[1]
const clientHandlers = (): Handlers =>
  (mocks.createClientTransport.mock.lastCall as unknown as [string, Handlers])[1]

describe('multiplayer UI', () => {
  let pinia: ReturnType<typeof createTestPinia>

  beforeEach(() => {
    pinia = createTestPinia()
    vi.clearAllMocks()
    localStorage.clear()
    mocks.generateRoomCode.mockReturnValue('ABCDEF')
  })

  describe('ConnectionStatus', () => {
    it('offers to open the lobby while offline', async () => {
      const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })

      const button = wrapper.find('button')
      expect(button.text()).toBe('Online spielen')

      await button.trigger('click')

      expect(wrapper.emitted('openLobby')).toHaveLength(1)
    })

    it('shows the room code while hosting', () => {
      const network = useNetworkStore()
      network.startHosting()

      const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })

      expect(wrapper.text()).toContain('Host · ABCDEF')
      expect(buttonByText(wrapper, 'Beenden').exists()).toBe(true)
    })

    it('ends hosting via the button', async () => {
      const network = useNetworkStore()
      network.startHosting()
      const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })

      await buttonByText(wrapper, 'Beenden').trigger('click')

      expect(network.isOnline).toBe(false)
    })

    it('shows the client connection states', async () => {
      const network = useNetworkStore()
      network.join('ab12cd')
      const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })
      const badge = () => wrapper.find('.status-badge')

      expect(badge().text()).toBe('Verbinde …')

      clientHandlers().onOpen()
      await flushPromises()
      expect(badge().text()).toBe('Verbunden · AB12CD')
      expect(badge().classes()).toContain('is-online')

      clientHandlers().onError?.('Kaputt')
      await flushPromises()
      expect(badge().text()).toBe('Kaputt')
      expect(badge().classes()).toContain('is-error')

      network.error = null
      await flushPromises()
      expect(badge().text()).toBe('Verbindungsfehler')

      clientHandlers().onClose?.()
      await flushPromises()
      expect(badge().text()).toBe('Getrennt')
    })

    it('leaves the room via the button', async () => {
      const network = useNetworkStore()
      network.join('ab12cd')
      const wrapper = mount(ConnectionStatus, { global: { plugins: [pinia] } })

      await buttonByText(wrapper, 'Verlassen').trigger('click')

      expect(network.isOnline).toBe(false)
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

    it('joins with the entered player name and remembers it', async () => {
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

      await wrapper.find('.name-input').setValue('Anna')
      await wrapper.find('.code-input').setValue('ab12cd')
      await wrapper.find('.join-form').trigger('submit')

      expect(useNetworkStore().playerName).toBe('Anna')
      expect(localStorage.getItem('quizshow.playerName')).toBe('Anna')

      wrapper.unmount()
      useNetworkStore().leave()
      const reopened = mount(LobbyModal, { global: { plugins: [pinia] } })
      expect((reopened.find('.name-input').element as HTMLInputElement).value).toBe('Anna')
    })

    it('shows the host status and stops hosting', async () => {
      const network = useNetworkStore()
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })
      await buttonByText(wrapper, 'Spiel hosten').trigger('click')

      expect(wrapper.text()).toContain('Sitzung wird gestartet …')

      hostHandlers().onOpen()
      hostHandlers().onViewerJoin?.('viewer-1')
      await flushPromises()
      expect(wrapper.text()).toContain('1 Mitspieler verbunden.')

      hostHandlers().onError?.('Raum belegt')
      await flushPromises()
      expect(wrapper.find('.error').text()).toBe('Raum belegt')

      network.error = null
      await flushPromises()
      expect(wrapper.text()).toContain('Fehler beim Starten.')

      await buttonByText(wrapper, 'Hosting beenden').trigger('click')
      expect(network.isHost).toBe(false)
    })

    it('copies the room code to the clipboard', async () => {
      const writeText = vi.fn(() => Promise.resolve())
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })
      await buttonByText(wrapper, 'Spiel hosten').trigger('click')

      await buttonByText(wrapper, 'Kopieren').trigger('click')

      expect(writeText).toHaveBeenCalledWith('ABCDEF')
      Reflect.deleteProperty(navigator, 'clipboard')
    })

    it('ignores clipboard failures', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
      })
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })
      await buttonByText(wrapper, 'Spiel hosten').trigger('click')

      await buttonByText(wrapper, 'Kopieren').trigger('click')
      await flushPromises()

      expect(wrapper.find('.room-code').text()).toBe('ABCDEF')
      Reflect.deleteProperty(navigator, 'clipboard')
    })

    it('does not copy without a room code', async () => {
      const writeText = vi.fn(() => Promise.resolve())
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      const network = useNetworkStore()
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })
      await buttonByText(wrapper, 'Spiel hosten').trigger('click')
      network.roomCode = null

      await buttonByText(wrapper, 'Kopieren').trigger('click')

      expect(writeText).not.toHaveBeenCalled()
      Reflect.deleteProperty(navigator, 'clipboard')
    })

    it('does not join without a room code', async () => {
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

      await wrapper.find('.code-input').setValue('   ')
      await wrapper.find('.join-form').trigger('submit')

      expect(mocks.createClientTransport).not.toHaveBeenCalled()
    })

    it('shows the client status and disconnects', async () => {
      const network = useNetworkStore()
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })
      await wrapper.find('.code-input').setValue('ab12cd')
      await wrapper.find('.join-form').trigger('submit')

      expect(wrapper.text()).toContain('Verbindung wird aufgebaut …')

      clientHandlers().onOpen()
      await flushPromises()
      expect(wrapper.text()).toContain('Verbunden mit Raum AB12CD.')

      network.playerName = 'Anna'
      await flushPromises()
      expect(wrapper.text()).toContain('Verbunden mit Raum AB12CD als Anna.')

      clientHandlers().onError?.('Host weg')
      await flushPromises()
      expect(wrapper.findAll('.lobby-section')[1].find('.hint').text()).toBe('Host weg')

      network.error = null
      await flushPromises()
      expect(wrapper.text()).toContain('Verbindung fehlgeschlagen.')

      clientHandlers().onClose?.()
      network.error = null
      await flushPromises()
      expect(wrapper.text()).toContain('Verbindung getrennt.')

      await buttonByText(wrapper, 'Verbindung trennen').trigger('click')
      expect(network.isClient).toBe(false)
    })

    it('copes with unavailable local storage', async () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

      expect((wrapper.find('.name-input').element as HTMLInputElement).value).toBe('')
      await wrapper.find('.name-input').setValue('Anna')
      await wrapper.find('.code-input').setValue('ab12cd')
      await wrapper.find('.join-form').trigger('submit')

      expect(mocks.createClientTransport).toHaveBeenCalled()
      getItem.mockRestore()
      setItem.mockRestore()
    })

    it('closes via the backdrop', async () => {
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

      await wrapper.find('.modal-backdrop').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closes on Escape', () => {
      const wrapper = mount(LobbyModal, { global: { plugins: [pinia] } })

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(wrapper.emitted('close')).toHaveLength(1)
      wrapper.unmount()
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
          revealed: true,
        },
        global: { plugins: [pinia] },
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
          revealed: true,
        },
        global: { plugins: [pinia] },
      })

      expect(wrapper.find('.award-section').exists()).toBe(true)
    })
  })
})
