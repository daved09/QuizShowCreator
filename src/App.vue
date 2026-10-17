<template>
  <header class="app-header">
    <h1 class="app-title">Quizshow Creator</h1>
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
      <button
        class="mode-toggle"
        :class="{ 'is-edit': quizStore.isEditMode }"
        type="button"
        role="switch"
        :aria-checked="quizStore.isEditMode"
        @click="quizStore.toggleEditMode()"
      >
        <span class="mode-toggle__icon" aria-hidden="true">{{ modeIcon }}</span>
        <span>{{ modeLabel }}</span>
      </button>
    </div>
  </header>

  <main>
    <QuizshowTable></QuizshowTable>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import QuizshowTable from './components/QuizshowTable.vue'
import { useQuizStore } from '@/stores/quiz.store'

const quizStore = useQuizStore()

const modeLabel = computed(() => (quizStore.isEditMode ? 'Präsentieren' : 'Bearbeiten'))
const modeIcon = computed(() => (quizStore.isEditMode ? '▶' : '✏️'))

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
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.add-column-button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  font: inherit;
  font-weight: 600;
  color: var(--color-on-primary);
  background: var(--color-primary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}
.add-column-button:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.add-column-button:active {
  transform: translateY(0) scale(0.98);
}
.add-column-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.1rem;
  font: inherit;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  user-select: none;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}
.mode-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}
.mode-toggle:active {
  transform: translateY(0) scale(0.98);
}
.mode-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.mode-toggle.is-edit {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: transparent;
  box-shadow: var(--shadow-sm);
}
.mode-toggle.is-edit:hover {
  color: var(--color-on-primary);
  background: var(--color-primary-hover);
  border-color: transparent;
}
.mode-toggle__icon {
  font-size: 0.9em;
  line-height: 1;
}
</style>
