import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseModal from '@/components/base/BaseModal.vue'

const mountModal = () =>
  mount(BaseModal, {
    props: { title: 'Titel' },
    slots: { default: '<p class="content">Inhalt</p>', overlay: '<div class="extra" />' },
  })

describe('BaseModal', () => {
  it('renders title, content and overlay', () => {
    const wrapper = mountModal()

    expect(wrapper.find('.modal-header h2').text()).toBe('Titel')
    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Titel')
    expect(wrapper.find('.content').exists()).toBe(true)
    expect(wrapper.find('.extra').exists()).toBe(true)
  })

  it('emits close via the cross, the backdrop and Escape', async () => {
    const wrapper = mountModal()

    await wrapper.find('.modal-close').trigger('click')
    await wrapper.find('.modal-backdrop').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('ignores clicks inside the dialog and stops listening once unmounted', async () => {
    const wrapper = mountModal()

    await wrapper.find('.content').trigger('click')
    wrapper.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
