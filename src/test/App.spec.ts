import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from '@/App.vue'
import { useQuizStore } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

type ElectronApi = Window['electronAPI']

const exportQuiz = vi.fn()
const importQuiz = vi.fn()

const setElectronApi = (overrides: Partial<ElectronApi> = {}): void => {
  window.electronAPI = {
    platform: 'linux',
    exportQuiz,
    importQuiz,
    ...overrides
  } as ElectronApi
}

describe('App', () => {
  let pinia: ReturnType<typeof createTestPinia>
  let store: ReturnType<typeof useQuizStore>

  beforeEach(() => {
    pinia = createTestPinia()
    store = useQuizStore()
    exportQuiz.mockReset()
    importQuiz.mockReset()
    vi.mocked(window.alert).mockClear()
    vi.mocked(window.confirm).mockClear()
    setElectronApi()
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'electronAPI')
  })

  const mountApp = (): VueWrapper => mount(App, { global: { plugins: [pinia] } })

  const buttonByText = (wrapper: VueWrapper, text: string) =>
    wrapper.findAll('button').find(button => button.text() === text)!

  it('shows the title and the game mode toggle', () => {
    const wrapper = mountApp()

    expect(wrapper.find('.app-title').text()).toBe('Quizshow Creator')
    expect(wrapper.find('.mode-toggle').text()).toContain('Spielen')
  })

  it('switches between edit and play mode', async () => {
    const wrapper = mountApp()

    await wrapper.find('.mode-toggle').trigger('click')

    expect(store.isEditMode).toBe(false)
    expect(wrapper.find('.mode-toggle').text()).toContain('Bearbeiten')
  })

  it('shows import/export/add column only in edit mode', async () => {
    const wrapper = mountApp()
    expect(wrapper.text()).toContain('Importieren')
    expect(wrapper.text()).toContain('Exportieren')
    expect(wrapper.text()).toContain('Spalte hinzufügen')

    await wrapper.find('.mode-toggle').trigger('click')

    expect(wrapper.text()).not.toContain('Importieren')
    expect(wrapper.text()).not.toContain('Exportieren')
    expect(wrapper.text()).not.toContain('Spalte hinzufügen')
  })

  it('adds a column via the button', async () => {
    const wrapper = mountApp()

    await buttonByText(wrapper, 'Spalte hinzufügen').trigger('click')

    expect(store.themes).toHaveLength(1)
  })

  describe('Export', () => {
    it('writes the quiz via the Electron API', async () => {
      exportQuiz.mockResolvedValue({ success: true, canceled: false, path: '/tmp/quiz.json' })
      store.addColumn()
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Exportieren').trigger('click')
      await flushPromises()

      expect(exportQuiz).toHaveBeenCalledTimes(1)
      const payload = JSON.parse(exportQuiz.mock.calls[0][0] as string)
      expect(payload.app).toBe('QuizShowCreator')
      expect(payload.themes).toHaveLength(1)
    })

    it('reports an error on export', async () => {
      exportQuiz.mockResolvedValue({ success: false, canceled: false, error: 'kaputt' })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Exportieren').trigger('click')
      await flushPromises()

      expect(window.alert).toHaveBeenCalledWith('Export fehlgeschlagen: kaputt')
    })

    it('stays silent when the export is canceled', async () => {
      exportQuiz.mockResolvedValue({ success: false, canceled: true })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Exportieren').trigger('click')
      await flushPromises()

      expect(window.alert).not.toHaveBeenCalled()
    })

    it('does nothing without the Electron API', async () => {
      Reflect.deleteProperty(window, 'electronAPI')
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Exportieren').trigger('click')
      await flushPromises()

      expect(exportQuiz).not.toHaveBeenCalled()
      expect(window.alert).not.toHaveBeenCalled()
    })
  })

  describe('Import', () => {
    const validFile = JSON.stringify({
      themes: [{ themeText: 'Import', questions: [{ points: 100, question: 'q', answer: 'a' }] }],
      players: [{ name: 'Anna', score: 0 }]
    })

    it('imports a valid file', async () => {
      importQuiz.mockResolvedValue({ success: true, canceled: false, data: validFile })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(store.themes).toHaveLength(1)
      expect(store.themes[0].themeText).toBe('Import')
      expect(store.players).toHaveLength(1)
    })

    it('asks before replacing existing themes', async () => {
      store.addColumn()
      vi.mocked(window.confirm).mockReturnValueOnce(true)
      importQuiz.mockResolvedValue({ success: true, canceled: false, data: validFile })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(window.confirm).toHaveBeenCalled()
      expect(importQuiz).toHaveBeenCalledTimes(1)
      expect(store.themes).toHaveLength(1)
      expect(store.themes[0].themeText).toBe('Import')
    })

    it('aborts when the replacement is not confirmed', async () => {
      store.addColumn()
      vi.mocked(window.confirm).mockReturnValueOnce(false)
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(importQuiz).not.toHaveBeenCalled()
      expect(store.themes[0].themeText).toBe('New Theme')
    })

    it('reports invalid JSON', async () => {
      importQuiz.mockResolvedValue({ success: true, canceled: false, data: 'kein json' })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(window.alert).toHaveBeenCalledWith(
        'Import fehlgeschlagen: Die Datei enthält kein gültiges JSON.'
      )
    })

    it('reports a file with invalid content', async () => {
      importQuiz.mockResolvedValue({
        success: true,
        canceled: false,
        data: JSON.stringify({ themes: 'nope' })
      })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(window.alert).toHaveBeenCalledWith(
        'Import fehlgeschlagen: Keine Themen in der Datei gefunden.'
      )
    })

    it('stays silent when the dialog is canceled', async () => {
      importQuiz.mockResolvedValue({ success: false, canceled: true })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(window.alert).not.toHaveBeenCalled()
      expect(store.themes).toHaveLength(0)
    })

    it('reports a read error', async () => {
      importQuiz.mockResolvedValue({ success: false, canceled: false, error: 'kaputt' })
      const wrapper = mountApp()

      await buttonByText(wrapper, 'Importieren').trigger('click')
      await flushPromises()

      expect(window.alert).toHaveBeenCalledWith('Import fehlgeschlagen: kaputt')
    })
  })
})
