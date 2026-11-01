import { beforeEach, describe, expect, it } from 'vitest'
import { usePermissions } from '@/composables/usePermissions'
import { useNetworkStore } from '@/stores/network.store'
import { useQuizStore } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

describe('usePermissions', () => {
  beforeEach(() => {
    createTestPinia()
  })

  it('lets an offline game control and, in edit mode, edit', () => {
    const { canControl, canEdit } = usePermissions()
    expect(canControl.value).toBe(true)
    expect(canEdit.value).toBe(true)

    useQuizStore().setEditMode(false)
    expect(canControl.value).toBe(true)
    expect(canEdit.value).toBe(false)
  })

  it('lets a viewer neither control nor edit, even in edit mode', () => {
    const { canControl, canEdit } = usePermissions()
    useNetworkStore().role = 'client'
    useQuizStore().setEditMode(true)

    expect(canControl.value).toBe(false)
    expect(canEdit.value).toBe(false)
  })
})
