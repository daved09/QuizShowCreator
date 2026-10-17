<script setup lang="ts">
import QuizshowTable from './components/QuizshowTable.vue'
import { useQuizStore } from '@/stores/quiz.store'

const quizStore = useQuizStore()

const onToggleEditMode = (event: Event): void => {
  const input = event.target as HTMLInputElement | null
  if (input) {
    quizStore.setEditMode(input.checked)
  }
}

const addColumn = (): void => {
  quizStore.addColumn()
}

const exportQuiz = async (): Promise<void> => {
  if (!window.electronAPI) return
  const json = JSON.stringify(quizStore.exportQuiz(), null, 2)
  const result = await window.electronAPI.exportQuiz(json)
  if (!result.success && !result.canceled) {
    alert(`Export fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`)
  }
}

const importQuiz = async (): Promise<void> => {
  if (!window.electronAPI) return
  if (quizStore.themes.length > 0) {
    const confirmed = confirm('Vorhandene Themen werden ersetzt. Fortfahren?')
    if (!confirmed) return
  }
  const result = await window.electronAPI.importQuiz()
  if (!result.success) {
    if (!result.canceled) {
      alert(`Import fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`)
    }
    return
  }
  try {
    const data = JSON.parse(result.data ?? '')
    const importResult = quizStore.importQuiz(data)
    if (!importResult.ok) {
      alert(`Import fehlgeschlagen: ${importResult.error}`)
    }
  } catch {
    alert('Import fehlgeschlagen: Die Datei enthält kein gültiges JSON.')
  }
}
</script>

<template>
  <header class="app-header">
    <h1 class="app-title">QuizShowCreator</h1>
    <div class="header-actions">
      <template v-if="quizStore.isEditMode">
        <button
          class="add-column-button"
          @click="importQuiz"
        >
          Importieren
        </button>
        <button
          class="add-column-button"
          @click="exportQuiz"
        >
          Exportieren
        </button>
        <button
          class="add-column-button"
          @click="addColumn"
        >
          Spalte hinzufügen
        </button>
      </template>
      <label class="edit-toggle">
        <input
          type="checkbox"
          :checked="quizStore.isEditMode"
          @change="onToggleEditMode"
        />
        <span>Edit Mode</span>
      </label>
    </div>
  </header>

  <main>
    <QuizshowTable></QuizshowTable>
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1rem;
}
.app-title {
  font-size: 1.25rem;
  margin: 0;
}
.edit-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-weight: bold;
}
.edit-toggle input {
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
