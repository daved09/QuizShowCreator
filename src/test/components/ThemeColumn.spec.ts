import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ThemeColumn from '@/components/ThemeColumn.vue'
import PointButton from '@/components/PointButton.vue'
import { useQuizStore, type Theme } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

describe('ThemeColumn', () => {
  let pinia: ReturnType<typeof createTestPinia>
  let store: ReturnType<typeof useQuizStore>
  let theme: Theme

  beforeEach(() => {
    pinia = createTestPinia()
    store = useQuizStore()
    store.addColumn()
    theme = store.themes[0]
  })

  const mountColumn = () =>
    mount(ThemeColumn, { props: { theme }, global: { plugins: [pinia] } })

  it('shows the theme title and one card per question', () => {
    const wrapper = mountColumn()

    expect(wrapper.find('.theme-header').text()).toBe('New Theme')
    expect(wrapper.findAllComponents(PointButton)).toHaveLength(theme.questions.length)
  })

  it('forwards clicks on a card as cardClicked', async () => {
    const wrapper = mountColumn()

    await wrapper.findAllComponents(PointButton)[2].trigger('click')

    expect(wrapper.emitted('cardClicked')).toEqual([[theme.id, 300]])
  })

  it('edits the theme title via click and Enter', async () => {
    const wrapper = mountColumn()

    await wrapper.find('.theme-header').trigger('click')
    const input = wrapper.find('.theme-header-input')
    expect(input.exists()).toBe(true)

    await input.setValue('  Geografie  ')
    await input.trigger('keydown.enter')

    expect(store.themes[0].themeText).toBe('Geografie')
    expect(wrapper.find('.theme-header-input').exists()).toBe(false)
  })

  it('saves the theme title on blur', async () => {
    const wrapper = mountColumn()

    await wrapper.find('.theme-header').trigger('click')
    await wrapper.find('.theme-header-input').setValue('Geschichte')
    await wrapper.find('.theme-header-input').trigger('blur')

    expect(store.themes[0].themeText).toBe('Geschichte')
  })

  it('discards the title change with Escape', async () => {
    const wrapper = mountColumn()

    await wrapper.find('.theme-header').trigger('click')
    await wrapper.find('.theme-header-input').setValue('Geschichte')
    await wrapper.find('.theme-header-input').trigger('keydown.esc')

    expect(store.themes[0].themeText).toBe('New Theme')
    expect(wrapper.find('.theme-header-input').exists()).toBe(false)
  })

  it('discards an in-progress edit when leaving edit mode', async () => {
    const wrapper = mountColumn()
    await wrapper.find('.theme-header').trigger('click')
    expect(wrapper.find('.theme-header-input').exists()).toBe(true)

    store.setEditMode(false)
    await nextTick()

    expect(wrapper.find('.theme-header-input').exists()).toBe(false)
  })

  it('does not start title editing outside of edit mode', async () => {
    store.setEditMode(false)
    const wrapper = mountColumn()

    await wrapper.find('.theme-header').trigger('click')

    expect(wrapper.find('.theme-header-input').exists()).toBe(false)
  })

  it('deletes a theme after confirmation', async () => {
    const wrapper = mountColumn()

    await wrapper.find('.delete-button').trigger('click')

    expect(window.confirm).toHaveBeenCalled()
    expect(store.themes).toHaveLength(0)
  })

  it('keeps the theme when the deletion is not confirmed', async () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    const wrapper = mountColumn()

    await wrapper.find('.delete-button').trigger('click')

    expect(store.themes).toHaveLength(1)
  })

  it('hides the delete button outside of edit mode', () => {
    store.setEditMode(false)
    const wrapper = mountColumn()

    expect(wrapper.find('.delete-button').exists()).toBe(false)
  })
})
