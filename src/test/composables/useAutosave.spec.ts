import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTOSAVE_INTERVAL_MS, AUTOSAVE_KEY, useAutosave } from '@/composables/useAutosave'
import { useQuizStore } from '@/stores/quiz.store'
import { createTestPinia } from '@/test/helpers'

describe('useAutosave', () => {
  beforeEach(() => {
    localStorage.clear()
    createTestPinia()
  })

  it('saves the quiz and restores it on the next start', () => {
    const first = useQuizStore()
    const { saveAutosave } = useAutosave()
    first.addColumn()
    first.addPlayer('Anna')
    saveAutosave()
    expect(localStorage.getItem(AUTOSAVE_KEY)).not.toBeNull()

    createTestPinia()
    useAutosave()
    const restored = useQuizStore()
    expect(restored.themes).toHaveLength(1)
    expect(restored.players).toEqual([])
    expect(localStorage.getItem(AUTOSAVE_KEY)).not.toContain('Anna')
  })

  it('clearAll removes the autosave and empties the board', () => {
    const store = useQuizStore()
    const { saveAutosave, clearAll } = useAutosave()
    store.addColumn()
    saveAutosave()

    clearAll()

    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
    expect(store.themes).toHaveLength(0)
  })

  it('saves periodically', () => {
    vi.useFakeTimers()
    try {
      const store = useQuizStore()
      useAutosave()
      store.addColumn()
      expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()

      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS)

      expect(localStorage.getItem(AUTOSAVE_KEY)).toContain('New Theme')
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a corrupt autosave', () => {
    localStorage.setItem(AUTOSAVE_KEY, '{nope')
    const store = useQuizStore()
    const { loadAutosave } = useAutosave()
    expect(loadAutosave()).toBe(false)
    expect(store.themes).toHaveLength(0)
  })
})
