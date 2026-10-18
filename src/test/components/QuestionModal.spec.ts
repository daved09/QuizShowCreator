import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import QuestionModal from '@/components/QuestionModal.vue'
import { useQuizStore, type Question } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

// Image/audio processing is mocked so the drag & drop / paste paths can be
// tested without a real FileReader / canvas implementation.
const { fileToImageDataUrl, isImageFile } = vi.hoisted(() => ({
  fileToImageDataUrl: vi.fn(),
  isImageFile: vi.fn()
}))
const { fileToAudioDataUrl, isAudioFile } = vi.hoisted(() => ({
  fileToAudioDataUrl: vi.fn(),
  isAudioFile: vi.fn()
}))
vi.mock('@/utils/image', () => ({ fileToImageDataUrl, isImageFile }))
vi.mock('@/utils/audio', () => ({ fileToAudioDataUrl, isAudioFile }))

const dispatchEscape = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

describe('QuestionModal', () => {
  let pinia: ReturnType<typeof createTestPinia>
  let store: ReturnType<typeof useQuizStore>

  beforeEach(() => {
    pinia = createTestPinia()
    store = useQuizStore()
    isImageFile.mockImplementation((file: File) => file.type.startsWith('image/'))
    isAudioFile.mockImplementation((file: File) => file.type.startsWith('audio/'))
  })

  describe('Edit mode', () => {
    const question: Question = { points: 100, question: 'Alte Frage', answer: 'Alte Antwort' }

    const mountEdit = (overrides: Partial<Question> = {}) =>
      mount(QuestionModal, {
        props: {
          mode: 'edit' as const,
          themeText: 'Thema',
          question: { ...question, ...overrides }
        },
        global: { plugins: [pinia] }
      })

    it('shows a matching dialog title', () => {
      expect(mountEdit().find('.modal-header h2').text()).toBe('Karte bearbeiten – Thema (100)')
    })

    it('emits the trimmed inputs on save', async () => {
      const wrapper = mountEdit()

      const [questionInput, answerInput] = wrapper.findAll('textarea')
      await questionInput.setValue('  Neue Frage  ')
      await answerInput.setValue('  Neue Antwort  ')
      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('save')).toEqual([
        [
          {
            points: 100,
            question: 'Neue Frage',
            answer: 'Neue Antwort',
            image: undefined,
            audio: undefined
          }
        ]
      ])
    })

    it('prevents saving with a non-integer point value', async () => {
      const wrapper = mountEdit({ points: 100.5 })

      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('.error').text()).toBe('Bitte eine ganze Punktzahl eingeben.')
      expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('shows an image preview and removes the image', async () => {
      const wrapper = mountEdit({ image: 'data:image/png;base64,AAAA' })

      expect(wrapper.find('.image-preview').exists()).toBe(true)

      await wrapper.find('.remove-image').trigger('click')

      expect(wrapper.find('.image-preview').exists()).toBe(false)
    })

    it('emits close via the cancel button', async () => {
      const wrapper = mountEdit()

      const buttons = wrapper.findAll('.modal-actions button')
      await buttons[0].trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits close via the close cross and the backdrop', async () => {
      const viaCross = mountEdit()
      await viaCross.find('.modal-close').trigger('click')
      expect(viaCross.emitted('close')).toHaveLength(1)

      const viaBackdrop = mountEdit()
      await viaBackdrop.find('.modal-backdrop').trigger('click')
      expect(viaBackdrop.emitted('close')).toHaveLength(1)
    })

    it('emits close on Escape', async () => {
      const wrapper = mountEdit()
      await wrapper.find('form').trigger('submit')

      dispatchEscape()

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('View mode', () => {
    const question: Question = { points: 300, question: 'Hauptstadt von Frankreich?', answer: 'Paris' }

    const mountView = (props: Record<string, unknown> = {}) =>
      mount(QuestionModal, {
        props: {
          mode: 'view' as const,
          themeText: 'Geografie',
          question,
          answeredBy: null,
          ...props
        },
        global: { plugins: [pinia] }
      })

    it('shows the dialog title with points', () => {
      expect(mountView().find('.modal-header h2').text()).toBe('Geografie – 300 Punkte')
    })

    it('hides the answer initially and shows it after revealing', async () => {
      const wrapper = mountView()

      expect(wrapper.text()).toContain('Hauptstadt von Frankreich?')
      expect(wrapper.text()).not.toContain('Paris')
      const reveal = wrapper.find('.reveal-button')
      expect(reveal.text()).toBe('Antwort anzeigen')

      await reveal.trigger('click')

      expect(wrapper.text()).toContain('Paris')
      expect(wrapper.find('.reveal-button').text()).toBe('Antwort verbergen')
      expect(wrapper.find('.award-section').exists()).toBe(true)
    })

    it('shows a hint when no players exist yet', async () => {
      const wrapper = mountView()
      await wrapper.find('.reveal-button').trigger('click')

      expect(wrapper.find('.award-hint').text()).toBe('Noch keine Spieler angelegt.')
      expect(wrapper.find('.award-list').exists()).toBe(false)
    })

    it('awards points to the selected player', async () => {
      store.addPlayer('Anna')
      store.addPlayer('Bob')
      const wrapper = mountView()
      await wrapper.find('.reveal-button').trigger('click')

      const awards = wrapper.findAll('.award-button')
      expect(awards).toHaveLength(2)
      expect(awards[0].text()).toContain('Anna')
      expect(awards[0].text()).toContain('+300')

      await awards[0].trigger('click')

      expect(wrapper.emitted('award')).toEqual([[store.players[0].id]])
    })

    it('shows the answer directly when the card was already answered', () => {
      const wrapper = mountView({ answeredBy: 'Anna' })

      expect(wrapper.text()).toContain('Paris')
      expect(wrapper.find('.award-hint').text()).toBe('✔ Bereits beantwortet von Anna')
    })

    it('opens and closes the image fullscreen view', async () => {
      const wrapper = mountView({ question: { ...question, image: 'data:image/png;base64,AAAA' } })

      await wrapper.find('.view-image').trigger('click')
      expect(wrapper.find('.lightbox').exists()).toBe(true)

      await wrapper.find('.lightbox-close').trigger('click')
      expect(wrapper.find('.lightbox').exists()).toBe(false)
    })

    it('on Escape closes only the fullscreen view first', async () => {
      const wrapper = mountView({ question: { ...question, image: 'data:image/png;base64,AAAA' } })
      await wrapper.find('.view-image').trigger('click')

      dispatchEscape()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.lightbox').exists()).toBe(false)
      expect(wrapper.emitted('close')).toBeUndefined()

      dispatchEscape()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits close via the close button', async () => {
      const wrapper = mountView()

      await wrapper.find('.modal-actions .primary').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('shows the question audio for playback', () => {
      const wrapper = mountView({
        question: { ...question, audio: 'data:audio/mpeg;base64,AAAA' }
      })

      const audio = wrapper.find('.view-audio')
      expect(audio.exists()).toBe(true)
      expect(audio.attributes('src')).toBe('data:audio/mpeg;base64,AAAA')
    })

    it('shows no audio without an audio file', () => {
      expect(mountView().find('.view-audio').exists()).toBe(false)
    })
  })

  describe('Inserting an image', () => {
    const question: Question = { points: 100, question: 'Frage', answer: 'Antwort' }

    const mountEdit = () =>
      mount(QuestionModal, {
        props: { mode: 'edit' as const, themeText: 'Thema', question },
        global: { plugins: [pinia] }
      })

    const makeFile = () => new File(['x'], 'bild.png', { type: 'image/png' })

    beforeEach(() => {
      fileToImageDataUrl.mockReset()
    })

    it('takes over an image dropped in', async () => {
      fileToImageDataUrl.mockResolvedValue('data:image/png;base64,NEU')
      const wrapper = mountEdit()
      const textarea = wrapper.find('textarea')

      await textarea.trigger('dragover', { dataTransfer: { types: ['Files'] } })
      expect(textarea.classes()).toContain('is-dragging')

      await textarea.trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(fileToImageDataUrl).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.image-preview').attributes('src')).toBe('data:image/png;base64,NEU')
    })

    it('ignores drags without files', async () => {
      const wrapper = mountEdit()
      const textarea = wrapper.find('textarea')

      await textarea.trigger('dragover', { dataTransfer: { types: ['text/plain'] } })
      expect(textarea.classes()).not.toContain('is-dragging')

      await textarea.trigger('drop', { dataTransfer: { files: [] } })
      await flushPromises()

      expect(fileToImageDataUrl).not.toHaveBeenCalled()
    })

    it('clears the drag highlight on leave', async () => {
      const wrapper = mountEdit()
      const textarea = wrapper.find('textarea')

      await textarea.trigger('dragover', { dataTransfer: { types: ['Files'] } })
      await textarea.trigger('dragleave')

      expect(textarea.classes()).not.toContain('is-dragging')
    })

    it('takes over a pasted image from the clipboard', async () => {
      fileToImageDataUrl.mockResolvedValue('data:image/png;base64,PASTE')
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('paste', {
        clipboardData: {
          items: [{ kind: 'file', type: 'image/png', getAsFile: () => makeFile() }]
        }
      })
      await flushPromises()

      expect(fileToImageDataUrl).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.image-preview').attributes('src')).toBe('data:image/png;base64,PASTE')
    })

    it('ignores pasted text', async () => {
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('paste', {
        clipboardData: {
          items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }]
        }
      })
      await flushPromises()

      expect(fileToImageDataUrl).not.toHaveBeenCalled()
    })

    it('shows an error when the image cannot be read', async () => {
      fileToImageDataUrl.mockRejectedValue(new Error('Bitte eine Bilddatei auswählen.'))
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(wrapper.find('.error').text()).toBe('Bitte eine Bilddatei auswählen.')
    })
  })

  describe('Inserting audio', () => {
    const question: Question = { points: 100, question: 'Frage', answer: 'Antwort' }

    const mountEdit = (overrides: Partial<Question> = {}) =>
      mount(QuestionModal, {
        props: { mode: 'edit' as const, themeText: 'Thema', question: { ...question, ...overrides } },
        global: { plugins: [pinia] }
      })

    const makeFile = () => new File(['x'], 'song.mp3', { type: 'audio/mpeg' })

    beforeEach(() => {
      fileToAudioDataUrl.mockReset()
    })

    it('takes over an audio file dropped in', async () => {
      fileToAudioDataUrl.mockResolvedValue('data:audio/mpeg;base64,NEU')
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(fileToAudioDataUrl).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.audio-preview').attributes('src')).toBe('data:audio/mpeg;base64,NEU')
    })

    it('takes over a pasted audio file from the clipboard', async () => {
      fileToAudioDataUrl.mockResolvedValue('data:audio/mpeg;base64,PASTE')
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('paste', {
        clipboardData: {
          items: [{ kind: 'file', type: 'audio/mpeg', getAsFile: () => makeFile() }]
        }
      })
      await flushPromises()

      expect(fileToAudioDataUrl).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.audio-preview').attributes('src')).toBe('data:audio/mpeg;base64,PASTE')
    })

    it('shows an audio preview and removes the audio', async () => {
      const wrapper = mountEdit({ audio: 'data:audio/mpeg;base64,AAAA' })

      expect(wrapper.find('.audio-preview').exists()).toBe(true)

      await wrapper.find('.remove-audio').trigger('click')

      expect(wrapper.find('.audio-preview').exists()).toBe(false)
    })

    it('includes the audio on save', async () => {
      const wrapper = mountEdit({ audio: 'data:audio/mpeg;base64,AAAA' })

      await wrapper.find('form').trigger('submit')

      expect(wrapper.emitted('save')).toEqual([
        [
          {
            points: 100,
            question: 'Frage',
            answer: 'Antwort',
            image: undefined,
            audio: 'data:audio/mpeg;base64,AAAA'
          }
        ]
      ])
    })

    it('shows an error when the audio cannot be read', async () => {
      fileToAudioDataUrl.mockRejectedValue(new Error('Die Audiodatei ist zu groß (max. 10 MB).'))
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(wrapper.find('.error').text()).toBe('Die Audiodatei ist zu groß (max. 10 MB).')
    })

    it('rejects unknown file types with a hint', async () => {
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', {
        dataTransfer: { files: [new File(['x'], 'text.txt', { type: 'text/plain' })] }
      })
      await flushPromises()

      expect(fileToAudioDataUrl).not.toHaveBeenCalled()
      expect(fileToImageDataUrl).not.toHaveBeenCalled()
      expect(wrapper.find('.error').text()).toBe('Bitte eine Bild- oder Audiodatei auswählen.')
    })
  })
})
