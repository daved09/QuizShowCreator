import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PointButton from '@/components/PointButton.vue'

const mountButton = (props: Record<string, unknown> = {}) =>
  mount(PointButton, {
    props: { points: 100, ...props }
  })

describe('PointButton', () => {
  it('shows the point value', () => {
    expect(mountButton().text()).toContain('100')
  })

  it('emits pointButtonClicked with the point value on click', async () => {
    const wrapper = mountButton({ points: 300 })

    await wrapper.trigger('click')

    expect(wrapper.emitted('pointButtonClicked')).toEqual([[300]])
  })

  it('shows the edit marker in edit mode', () => {
    const wrapper = mountButton({ editMode: true })

    expect(wrapper.classes()).toContain('edit-mode')
    expect(wrapper.text()).toContain('✏️')
  })

  it('marks answered cards and names the player', () => {
    const wrapper = mountButton({ answered: true, answeredBy: 'Anna', editMode: true })

    expect(wrapper.classes()).toContain('is-answered')
    expect(wrapper.text()).toContain('✔')
    expect(wrapper.attributes('title')).toBe('Beantwortet von Anna')
  })

  it('shows no title without a player name', () => {
    const wrapper = mountButton({ answered: true, answeredBy: null })

    expect(wrapper.attributes('title')).toBeUndefined()
  })

  it('marks cards with an image', () => {
    const wrapper = mountButton({ hasImage: true })

    expect(wrapper.text()).toContain('🖼')
    expect(wrapper.find('.image-badge').attributes('title')).toBe('Mit Bild')
  })

  it('marks cards with audio', () => {
    const wrapper = mountButton({ hasAudio: true })

    expect(wrapper.text()).toContain('🔊')
    expect(wrapper.find('.audio-badge').attributes('title')).toBe('Mit Audio')
  })

  it('shows no markers without states', () => {
    const wrapper = mountButton()

    expect(wrapper.classes()).not.toContain('edit-mode')
    expect(wrapper.classes()).not.toContain('is-answered')
  })
})
