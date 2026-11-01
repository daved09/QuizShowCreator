import { useQuizStore } from '@/stores/quiz.store'
import { confirmAction, showError } from '@/utils/dialogs'

// Import and export of the quiz JSON via the native Electron file dialogs.
// Outside of Electron (no `window.electronAPI`) both are no-ops.
export const useQuizFile = () => {
  const quiz = useQuizStore()

  const exportQuiz = async (): Promise<void> => {
    if (!window.electronAPI) return
    const json = JSON.stringify(quiz.exportQuiz(), null, 2)
    const result = await window.electronAPI.exportQuiz(json)
    if (!result.success && !result.canceled) {
      showError(`Export fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`)
    }
  }

  const importQuiz = async (): Promise<void> => {
    if (!window.electronAPI) return
    if (quiz.themes.length > 0 && !confirmAction('Vorhandene Themen werden ersetzt. Fortfahren?')) {
      return
    }
    const result = await window.electronAPI.importQuiz()
    if (!result.success) {
      if (!result.canceled) {
        showError(`Import fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`)
      }
      return
    }
    let data: unknown
    try {
      data = JSON.parse(result.data ?? '')
    } catch {
      showError('Import fehlgeschlagen: Die Datei enthält kein gültiges JSON.')
      return
    }
    const importResult = quiz.importQuiz(data)
    if (!importResult.ok) {
      showError(`Import fehlgeschlagen: ${importResult.error}`)
    }
  }

  return { exportQuiz, importQuiz }
}
