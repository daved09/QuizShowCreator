import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PointButton from '@/components/PointButton.vue'

const mountButton = (props: Record<string, unknown> = {}) =>
  mount(PointButton, {
    props: { points: 100, ...props }
  })

describe('PointButton', () => {
  it('zeigt die Punktzahl an', () => {
    expect(mountButton().text()).toContain('100')
  })

  it('sendet pointButtonClicked mit der Punktzahl beim Klick', async () => {
    const wrapper = mountButton({ points: 300 })

    await wrapper.trigger('click')

    expect(wrapper.emitted('pointButtonClicked')).toEqual([[300]])
  })

  it('zeigt im Edit-Modus die Bearbeitungs-Markierung', () => {
    const wrapper = mountButton({ editMode: true })

    expect(wrapper.classes()).toContain('edit-mode')
    expect(wrapper.text()).toContain('✏️')
  })

  it('markiert beantwortete Karten und nennt den Spieler', () => {
    const wrapper = mountButton({ answered: true, answeredBy: 'Anna', editMode: true })

    expect(wrapper.classes()).toContain('is-answered')
    expect(wrapper.text()).toContain('✔')
    expect(wrapper.attributes('title')).toBe('Beantwortet von Anna')
  })

  it('zeigt keinen Titel ohne Spielernamen', () => {
    const wrapper = mountButton({ answered: true, answeredBy: null })

    expect(wrapper.attributes('title')).toBeUndefined()
  })

  it('kennzeichnet Karten mit Bild', () => {
    const wrapper = mountButton({ hasImage: true })

    expect(wrapper.text()).toContain('🖼')
    expect(wrapper.find('.image-badge').attributes('title')).toBe('Mit Bild')
  })

  it('kennzeichnet Karten mit Audio', () => {
    const wrapper = mountButton({ hasAudio: true })

    expect(wrapper.text()).toContain('🔊')
    expect(wrapper.find('.audio-badge').attributes('title')).toBe('Mit Audio')
  })

  it('zeigt ohne Zustände keine Markierungen', () => {
    const wrapper = mountButton()

    expect(wrapper.classes()).not.toContain('edit-mode')
    expect(wrapper.classes()).not.toContain('is-answered')
  })
})
