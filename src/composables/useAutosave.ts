import { onBeforeUnmount } from 'vue'
import { useNetworkStore } from '@/stores/network.store'
import { useQuizStore } from '@/stores/quiz.store'

export const AUTOSAVE_KEY = 'quizshow-autosave'

// Autosave cache: the quiz is written to localStorage when the window closes
// and restored on the next start. Viewers never save, their board belongs to the host.
export const useAutosave = () => {
  const quiz = useQuizStore()
  const network = useNetworkStore()

  const clearAutosave = (): void => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY)
    } catch {
      // storage unavailable: nothing to clear
    }
  }

  const saveAutosave = (): void => {
    if (network.isClient) return
    try {
      if (quiz.themes.length === 0) {
        localStorage.removeItem(AUTOSAVE_KEY)
        return
      }
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(quiz.exportQuiz()))
    } catch (error) {
      // e.g. quota exceeded by large images/audio
      console.warn('Autosave fehlgeschlagen:', error)
    }
  }

  const loadAutosave = (): boolean => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY)
      if (!raw) return false
      return quiz.importQuiz(JSON.parse(raw)).ok
    } catch {
      return false
    }
  }

  // Removes the autosave and empties the board (themes, players, runtime state).
  const clearAll = (): void => {
    clearAutosave()
    quiz.clearAll()
    network.restorePlayers()
  }

  loadAutosave()
  window.addEventListener('pagehide', saveAutosave)
  window.addEventListener('beforeunload', saveAutosave)
  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', saveAutosave)
    window.removeEventListener('beforeunload', saveAutosave)
  })

  return { saveAutosave, loadAutosave, clearAutosave, clearAll }
}
