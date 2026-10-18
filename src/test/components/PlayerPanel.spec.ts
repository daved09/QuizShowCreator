import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerPanel from '@/components/PlayerPanel.vue'
import { useQuizStore } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

describe('PlayerPanel', () => {
  let pinia: ReturnType<typeof createTestPinia>
  let store: ReturnType<typeof useQuizStore>

  beforeEach(() => {
    pinia = createTestPinia()
    store = useQuizStore()
  })

  const mountPanel = () => mount(PlayerPanel, { global: { plugins: [pinia] } })

  it('zeigt einen Hinweis, wenn keine Spieler existieren', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.empty-hint').text()).toBe('Noch keine Spieler.')
    expect(wrapper.find('.player-list').exists()).toBe(false)
  })

  it('listet Spieler mit Punkten auf', () => {
    store.addPlayer('Anna')
    store.addPlayer('Bob')
    store.players[0].score = 300

    const wrapper = mountPanel()

    const items = wrapper.findAll('.player-item')
    expect(items).toHaveLength(2)
    expect(items[0].find('.player-name').text()).toBe('Anna')
    expect(items[0].find('.player-score').text()).toBe('300')
    expect(items[1].find('.player-name').text()).toBe('Bob')
  })

  it('fügt einen Spieler über das Formular hinzu und leert die Eingabe', async () => {
    const wrapper = mountPanel()
    const input = wrapper.find('form .name-input')

    await input.setValue('  Anna  ')
    await wrapper.find('form').trigger('submit')

    expect(store.players).toHaveLength(1)
    expect(store.players[0].name).toBe('Anna')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('vergibt bei leerer Eingabe einen Standardnamen', async () => {
    const wrapper = mountPanel()

    await wrapper.find('form').trigger('submit')

    expect(store.players[0].name).toBe('Spieler 1')
  })

  it('entfernt einen Spieler über den Löschen-Button', async () => {
    store.addPlayer('Anna')
    const wrapper = mountPanel()

    await wrapper.find('.delete-button').trigger('click')

    expect(store.players).toHaveLength(0)
  })

  it('benennt einen Spieler über Klick und Enter um', async () => {
    store.addPlayer('Anna')
    const wrapper = mountPanel()

    await wrapper.find('.player-name').trigger('click')
    const input = wrapper.find('.player-item .name-input')
    expect(input.exists()).toBe(true)

    await input.setValue('Alice')
    await input.trigger('keydown.enter')

    expect(store.players[0].name).toBe('Alice')
    expect(wrapper.find('.player-item .name-input').exists()).toBe(false)
  })

  it('verwirft die Umbenennung mit Escape', async () => {
    store.addPlayer('Anna')
    const wrapper = mountPanel()

    await wrapper.find('.player-name').trigger('click')
    await wrapper.find('.player-item .name-input').setValue('Alice')
    await wrapper.find('.player-item .name-input').trigger('keydown.esc')

    expect(store.players[0].name).toBe('Anna')
    expect(wrapper.find('.player-item .name-input').exists()).toBe(false)
  })

  it('setzt die Runde nach Bestätigung zurück', async () => {
    store.addColumn()
    store.addPlayer('Anna')
    store.awardPointsForCard(store.players[0].id, store.themes[0].id, 200)
    const wrapper = mountPanel()

    await wrapper.find('.reset-button').trigger('click')

    expect(window.confirm).toHaveBeenCalled()
    expect(store.players[0].score).toBe(0)
  })

  it('bricht das Zurücksetzen ab, wenn nicht bestätigt wird', async () => {
    store.addColumn()
    store.addPlayer('Anna')
    store.awardPointsForCard(store.players[0].id, store.themes[0].id, 200)
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    const wrapper = mountPanel()

    await wrapper.find('.reset-button').trigger('click')

    expect(store.players[0].score).toBe(200)
  })

  it('blendet Bearbeitungsfunktionen außerhalb des Edit-Modus aus', async () => {
    store.addPlayer('Anna')
    store.setEditMode(false)
    const wrapper = mountPanel()

    expect(wrapper.find('.add-form').exists()).toBe(false)
    expect(wrapper.find('.delete-button').exists()).toBe(false)
    expect(wrapper.find('.reset-button').exists()).toBe(false)

    await wrapper.find('.player-name').trigger('click')
    expect(wrapper.find('.player-item .name-input').exists()).toBe(false)
  })
})
