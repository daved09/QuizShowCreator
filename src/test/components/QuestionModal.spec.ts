import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import QuestionModal from '@/components/QuestionModal.vue'
import { useQuizStore, type Question } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

// Die Bild-/Audioverarbeitung wird gemockt, damit die Drag&Drop-/Paste-Pfade
// ohne echte FileReader-/Canvas-Implementierung getestet werden können.
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

  describe('Edit-Modus', () => {
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

    it('zeigt einen passenden Dialogtitel', () => {
      expect(mountEdit().find('.modal-header h2').text()).toBe('Karte bearbeiten – Thema (100)')
    })

    it('sendet die getrimmten Eingaben beim Speichern', async () => {
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

    it('verhindert das Speichern bei nicht-ganzzahliger Punktzahl', async () => {
      const wrapper = mountEdit({ points: 100.5 })

      await wrapper.find('form').trigger('submit')

      expect(wrapper.find('.error').text()).toBe('Bitte eine ganze Punktzahl eingeben.')
      expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('zeigt eine Bildvorschau und entfernt das Bild', async () => {
      const wrapper = mountEdit({ image: 'data:image/png;base64,AAAA' })

      expect(wrapper.find('.image-preview').exists()).toBe(true)

      await wrapper.find('.remove-image').trigger('click')

      expect(wrapper.find('.image-preview').exists()).toBe(false)
    })

    it('sendet close über den Abbrechen-Button', async () => {
      const wrapper = mountEdit()

      const buttons = wrapper.findAll('.modal-actions button')
      await buttons[0].trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('sendet close über das Schließen-Kreuz und den Hintergrund', async () => {
      const viaCross = mountEdit()
      await viaCross.find('.modal-close').trigger('click')
      expect(viaCross.emitted('close')).toHaveLength(1)

      const viaBackdrop = mountEdit()
      await viaBackdrop.find('.modal-backdrop').trigger('click')
      expect(viaBackdrop.emitted('close')).toHaveLength(1)
    })

    it('sendet close bei Escape', async () => {
      const wrapper = mountEdit()
      await wrapper.find('form').trigger('submit')

      dispatchEscape()

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('View-Modus', () => {
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

    it('zeigt den Dialogtitel mit Punkten', () => {
      expect(mountView().find('.modal-header h2').text()).toBe('Geografie – 300 Punkte')
    })

    it('verdeckt die Antwort zunächst und zeigt sie nach dem Aufdecken', async () => {
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

    it('zeigt einen Hinweis, wenn noch keine Spieler existieren', async () => {
      const wrapper = mountView()
      await wrapper.find('.reveal-button').trigger('click')

      expect(wrapper.find('.award-hint').text()).toBe('Noch keine Spieler angelegt.')
      expect(wrapper.find('.award-list').exists()).toBe(false)
    })

    it('vergibt Punkte an den gewählten Spieler', async () => {
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

    it('zeigt die Antwort direkt, wenn die Karte bereits beantwortet wurde', () => {
      const wrapper = mountView({ answeredBy: 'Anna' })

      expect(wrapper.text()).toContain('Paris')
      expect(wrapper.find('.award-hint').text()).toBe('✔ Bereits beantwortet von Anna')
    })

    it('öffnet und schließt die Bild-Vollbildansicht', async () => {
      const wrapper = mountView({ question: { ...question, image: 'data:image/png;base64,AAAA' } })

      await wrapper.find('.view-image').trigger('click')
      expect(wrapper.find('.lightbox').exists()).toBe(true)

      await wrapper.find('.lightbox-close').trigger('click')
      expect(wrapper.find('.lightbox').exists()).toBe(false)
    })

    it('schließt bei Escape zuerst nur die Vollbildansicht', async () => {
      const wrapper = mountView({ question: { ...question, image: 'data:image/png;base64,AAAA' } })
      await wrapper.find('.view-image').trigger('click')

      dispatchEscape()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.lightbox').exists()).toBe(false)
      expect(wrapper.emitted('close')).toBeUndefined()

      dispatchEscape()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('sendet close über den Schließen-Button', async () => {
      const wrapper = mountView()

      await wrapper.find('.modal-actions .primary').trigger('click')

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('zeigt das Frage-Audio zur Wiedergabe', () => {
      const wrapper = mountView({
        question: { ...question, audio: 'data:audio/mpeg;base64,AAAA' }
      })

      const audio = wrapper.find('.view-audio')
      expect(audio.exists()).toBe(true)
      expect(audio.attributes('src')).toBe('data:audio/mpeg;base64,AAAA')
    })

    it('zeigt kein Audio ohne Audiodatei', () => {
      expect(mountView().find('.view-audio').exists()).toBe(false)
    })
  })

  describe('Bild einfügen', () => {
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

    it('übernimmt ein per Drop abgelegtes Bild', async () => {
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

    it('ignoriert Drags ohne Dateien', async () => {
      const wrapper = mountEdit()
      const textarea = wrapper.find('textarea')

      await textarea.trigger('dragover', { dataTransfer: { types: ['text/plain'] } })
      expect(textarea.classes()).not.toContain('is-dragging')

      await textarea.trigger('drop', { dataTransfer: { files: [] } })
      await flushPromises()

      expect(fileToImageDataUrl).not.toHaveBeenCalled()
    })

    it('hebt die Drag-Markierung beim Verlassen wieder auf', async () => {
      const wrapper = mountEdit()
      const textarea = wrapper.find('textarea')

      await textarea.trigger('dragover', { dataTransfer: { types: ['Files'] } })
      await textarea.trigger('dragleave')

      expect(textarea.classes()).not.toContain('is-dragging')
    })

    it('übernimmt ein eingefügtes Bild aus der Zwischenablage', async () => {
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

    it('ignoriert eingefügten Text', async () => {
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('paste', {
        clipboardData: {
          items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }]
        }
      })
      await flushPromises()

      expect(fileToImageDataUrl).not.toHaveBeenCalled()
    })

    it('zeigt einen Fehler, wenn das Bild nicht gelesen werden kann', async () => {
      fileToImageDataUrl.mockRejectedValue(new Error('Bitte eine Bilddatei auswählen.'))
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(wrapper.find('.error').text()).toBe('Bitte eine Bilddatei auswählen.')
    })
  })

  describe('Audio einfügen', () => {
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

    it('übernimmt eine per Drop abgelegte Audiodatei', async () => {
      fileToAudioDataUrl.mockResolvedValue('data:audio/mpeg;base64,NEU')
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(fileToAudioDataUrl).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.audio-preview').attributes('src')).toBe('data:audio/mpeg;base64,NEU')
    })

    it('übernimmt eine eingefügte Audiodatei aus der Zwischenablage', async () => {
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

    it('zeigt eine Audio-Vorschau und entfernt das Audio', async () => {
      const wrapper = mountEdit({ audio: 'data:audio/mpeg;base64,AAAA' })

      expect(wrapper.find('.audio-preview').exists()).toBe(true)

      await wrapper.find('.remove-audio').trigger('click')

      expect(wrapper.find('.audio-preview').exists()).toBe(false)
    })

    it('sendet das Audio beim Speichern mit', async () => {
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

    it('zeigt einen Fehler, wenn das Audio nicht gelesen werden kann', async () => {
      fileToAudioDataUrl.mockRejectedValue(new Error('Die Audiodatei ist zu groß (max. 10 MB).'))
      const wrapper = mountEdit()

      await wrapper.find('textarea').trigger('drop', { dataTransfer: { files: [makeFile()] } })
      await flushPromises()

      expect(wrapper.find('.error').text()).toBe('Die Audiodatei ist zu groß (max. 10 MB).')
    })

    it('lehnt unbekannte Dateitypen mit einem Hinweis ab', async () => {
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
