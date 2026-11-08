import { onBeforeUnmount } from 'vue'
import { useNetworkStore } from '@/stores/network.store'
import { useQuizStore } from '@/stores/quiz.store'

export const AUTOSAVE_KEY = 'quizshow-autosave'
export const AUTOSAVE_INTERVAL_MS = 10_000

// Autosave cache: the quiz is written to localStorage every few seconds and when
// the window closes, and restored on the next start. Viewers never save, their board belongs to the host.
export const useAutosave = () => {
  const quiz = useQuizStore()
  const network = useNetworkStore()

  let lastSaved: string | null = null

  const clearAutosave = (): void => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY)
      lastSaved = null
    } catch {
      // storage unavailable: nothing to clear
    }
  }

  const saveAutosave = (): void => {
    if (network.isClient) return
    try {
      if (quiz.themes.length === 0) {
        localStorage.removeItem(AUTOSAVE_KEY)
        lastSaved = null
        return
      }
      const json = JSON.stringify(quiz.exportQuiz())
      // Skip the write when nothing changed since the last save.
      if (json === lastSaved) return
      localStorage.setItem(AUTOSAVE_KEY, json)
      lastSaved = json
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
  // Periodic save, so little is lost on a crash.
  const timer = window.setInterval(saveAutosave, AUTOSAVE_INTERVAL_MS)
  window.addEventListener('pagehide', saveAutosave)
  window.addEventListener('beforeunload', saveAutosave)
  onBeforeUnmount(() => {
    window.clearInterval(timer)
    window.removeEventListener('pagehide', saveAutosave)
    window.removeEventListener('beforeunload', saveAutosave)
  })

  return { saveAutosave, loadAutosave, clearAutosave, clearAll }
}
