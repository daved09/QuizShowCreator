<template>
  <header class="app-header">
    <h1 class="app-title">Quizshow Creator</h1>
    <div class="header-actions">
      <template v-if="canEdit">
        <button class="btn btn-primary" @click="importQuiz">
          <AppIcon name="file_upload" />Importieren
        </button>
        <button class="btn btn-primary" @click="exportQuiz">
          <AppIcon name="file_download" />Exportieren
        </button>
        <button class="btn btn-primary" @click="addColumn">
          <AppIcon name="add" />Spalte hinzufügen
        </button>
        <button class="btn btn-primary" @click="clearEverything">
          <AppIcon name="delete" />Autosave löschen
        </button>
      </template>
      <ConnectionStatus @open-lobby="showLobby = true" />
      <button
        v-if="canControl"
        class="mode-toggle"
        :class="{ 'is-edit': quizStore.isEditMode }"
        type="button"
        role="switch"
        :aria-checked="quizStore.isEditMode"
        @click="quizStore.toggleEditMode()"
      >
        <AppIcon :key="modeIcon" :name="modeIcon" class="mode-toggle__icon" />
        <span>{{ modeLabel }}</span>
      </button>
    </div>
  </header>

  <LobbyModal v-if="showLobby" @close="showLobby = false" />

  <div class="app-body">
    <main>
      <QuizshowTable></QuizshowTable>
    </main>
    <PlayerPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QuizshowTable from './components/QuizshowTable.vue'
import PlayerPanel from './components/PlayerPanel.vue'
import AppIcon, { type IconName } from './components/base/AppIcon.vue'
import ConnectionStatus from './components/ConnectionStatus.vue'
import LobbyModal from './components/LobbyModal.vue'
import { useQuizStore } from '@/stores/quiz.store'
import { usePermissions } from '@/composables/usePermissions'
import { useQuizFile } from '@/composables/useQuizFile'
import { useAutosave } from '@/composables/useAutosave'
import { playBuzzerSound } from '@/utils/buzzer'
import { confirmAction } from '@/utils/dialogs'

const quizStore = useQuizStore()
const { canControl, canEdit } = usePermissions()
const { exportQuiz, importQuiz } = useQuizFile()

const { clearAll } = useAutosave()

const showLobby = ref(false)

const clearEverything = (): void => {
  if (
    !confirmAction(
      'Autosave löschen und alles zurücksetzen? Nicht exportierte Änderungen gehen verloren.',
    )
  ) {
    return
  }
  clearAll()
}

const modeLabel = computed(() => (quizStore.isEditMode ? 'Spielen' : 'Bearbeiten'))
const modeIcon = computed<IconName>(() => (quizStore.isEditMode ? 'play_arrow' : 'edit'))

// Everyone hears the buzzer, host and viewers alike.
watch(
  () => quizStore.buzzedBy,
  (playerId) => {
    if (playerId) playBuzzerSound()
  },
)

const addColumn = (): void => {
  quizStore.addColumn()
}
</script>

<style scoped>
.app-body {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  width: 100%;
  padding: 0 1.5rem 1.5rem;
}
.app-body main {
  flex: 1;
  min-width: 0;
}
/* Top app bar */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  width: 100%;
  min-height: 64px;
  padding: 8px 16px 8px 24px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  margin-bottom: 1.5rem;
}
.app-title {
  margin: 0;
  /* title-large */
  font-size: 22px;
  line-height: 28px;
  font-weight: 400;
}
.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
/* Filter chip acting as a mode switch */
.mode-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 32px;
  padding: 0 16px;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1px;
  color: var(--md-sys-color-on-surface-variant);
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-sm);
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}
.mode-toggle::before {
  content: '';
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
}
.mode-toggle:hover::before {
  opacity: var(--md-state-hover);
}
.mode-toggle:active::before {
  opacity: var(--md-state-pressed);
}
.mode-toggle:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}
.mode-toggle.is-edit {
  color: var(--md-sys-color-on-secondary-container);
  background: var(--md-sys-color-secondary-container);
  border-color: transparent;
}
.mode-toggle__icon {
  font-size: 18px;
  display: inline-block;
  animation: md-pop var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing) both;
  font-size: 0.9em;
  line-height: 1;
}
</style>
