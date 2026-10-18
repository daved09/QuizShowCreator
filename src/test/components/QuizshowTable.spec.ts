import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuizshowTable from '@/components/QuizshowTable.vue'
import ThemeColumn from '@/components/ThemeColumn.vue'
import QuestionModal from '@/components/QuestionModal.vue'
import PointButton from '@/components/PointButton.vue'
import { useQuizStore } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

describe('QuizshowTable', () => {
  let pinia: ReturnType<typeof createTestPinia>
  let store: ReturnType<typeof useQuizStore>

  beforeEach(() => {
    pinia = createTestPinia()
    store = useQuizStore()
  })

  const mountTable = () => mount(QuizshowTable, { global: { plugins: [pinia] } })

  const openFirstCard = async (wrapper: ReturnType<typeof mountTable>) => {
    await wrapper.findAllComponents(PointButton)[0].trigger('click')
    return wrapper.findComponent(QuestionModal)
  }

  it('rendert für jedes Thema eine Spalte', () => {
    store.addColumn()
    store.addColumn()

    const wrapper = mountTable()

    expect(wrapper.findAllComponents(ThemeColumn)).toHaveLength(2)
  })

  it('öffnet beim Klick auf eine Karte den Dialog im Edit-Modus', async () => {
    store.addColumn()
    const wrapper = mountTable()

    expect(wrapper.findComponent(QuestionModal).exists()).toBe(false)
    const modal = await openFirstCard(wrapper)

    expect(modal.exists()).toBe(true)
    expect(modal.props('mode')).toBe('edit')
  })

  it('öffnet den Dialog im View-Modus außerhalb des Edit-Modus', async () => {
    store.addColumn()
    store.setEditMode(false)
    const wrapper = mountTable()

    const modal = await openFirstCard(wrapper)

    expect(modal.props('mode')).toBe('view')
  })

  it('schließt den Dialog beim Empfang von close', async () => {
    store.addColumn()
    const wrapper = mountTable()
    const modal = await openFirstCard(wrapper)

    modal.vm.$emit('close')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(QuestionModal).exists()).toBe(false)
  })

  it('speichert Kartendaten im Store und schließt den Dialog', async () => {
    store.addColumn()
    const themeId = store.themes[0].id
    const wrapper = mountTable()
    const modal = await openFirstCard(wrapper)

    const [questionInput, answerInput] = modal.findAll('textarea')
    await questionInput.setValue('Neue Frage')
    await answerInput.setValue('Neue Antwort')
    await modal.find('form').trigger('submit')

    const question = store.themes[0].questions.find(q => q.points === 100)
    expect(question?.question).toBe('Neue Frage')
    expect(question?.answer).toBe('Neue Antwort')
    expect(wrapper.findComponent(QuestionModal).exists()).toBe(false)
    expect(store.themes[0].id).toBe(themeId)
  })

  it('meldet doppelte Punktzahlen und hält den Dialog offen', async () => {
    store.addColumn()
    const wrapper = mountTable()
    const modal = await openFirstCard(wrapper)

    modal.vm.$emit('save', { points: 200, question: 'x', answer: 'y' })
    await wrapper.vm.$nextTick()

    expect(window.alert).toHaveBeenCalledWith('Diese Punktzahl existiert in dieser Spalte bereits.')
    expect(wrapper.findComponent(QuestionModal).exists()).toBe(true)
  })

  it('vergibt beim Spielen Punkte und schließt den Dialog', async () => {
    store.addColumn()
    store.addPlayer('Anna')
    store.setEditMode(false)
    const wrapper = mountTable()
    const modal = await openFirstCard(wrapper)

    await modal.find('.reveal-button').trigger('click')
    await modal.find('.award-button').trigger('click')

    expect(store.players[0].score).toBe(100)
    expect(wrapper.findComponent(QuestionModal).exists()).toBe(false)
  })

  it('zeigt bereits vergebene Punkte im Dialog an', async () => {
    store.addColumn()
    store.addPlayer('Anna')
    const themeId = store.themes[0].id
    store.awardPointsForCard(store.players[0].id, themeId, 100)
    store.setEditMode(false)
    const wrapper = mountTable()

    const modal = await openFirstCard(wrapper)

    expect(modal.props('answeredBy')).toBe('Anna')
  })

  it('schließt einen veralteten Dialog, wenn die Frage nicht mehr existiert', async () => {
    store.addColumn()
    const wrapper = mountTable()
    await openFirstCard(wrapper)
    expect(wrapper.findComponent(QuestionModal).exists()).toBe(true)

    store.themes[0].questions = []
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(QuestionModal).exists()).toBe(false)
  })
})
