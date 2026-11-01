<template>
  <aside class="player-panel">
    <h2 class="panel-title">Spieler</h2>

    <p v-if="quizStore.players.length === 0" class="empty-hint">Noch keine Spieler.</p>

    <ul v-else class="player-list">
      <li
        v-for="player in quizStore.players"
        :key="player.id"
        class="player-item"
        :class="{ 'is-buzzed': quizStore.buzzedBy === player.id }"
      >
        <template v-if="editingId === player.id">
          <input
            :ref="setNameInput"
            v-model="nameDraft"
            :maxlength="MAX_PLAYER_NAME_LENGTH"
            class="name-input"
            @keydown.enter="saveName(player.id)"
            @keydown.esc="cancelName"
            @blur="saveName(player.id)"
          />
        </template>
        <template v-else>
          <span
            class="player-name"
            :class="{ editable: quizStore.isEditMode }"
            :title="quizStore.isEditMode ? 'Zum Umbenennen klicken' : undefined"
            @click="startEditing(player.id, player.name)"
            >{{ player.name }}</span
          >
          <button
            v-if="quizStore.isEditMode"
            class="delete-button"
            title="Spieler entfernen"
            @click="quizStore.removePlayer(player.id)"
          >
            ✖
          </button>
        </template>
        <span v-if="quizStore.buzzedBy === player.id" class="buzzed-icon" title="Hat gebuzzert">
          🔔
        </span>
        <span class="player-score">{{ player.score }}</span>
      </li>
    </ul>

    <form v-if="quizStore.isEditMode" class="add-form" @submit.prevent="addPlayer">
      <input
        v-model="newName"
        class="name-input"
        :maxlength="MAX_PLAYER_NAME_LENGTH"
        placeholder="Neuer Spieler …"
      />
      <button type="submit" class="btn btn-primary btn-sm">Hinzufügen</button>
    </form>

    <button
      v-if="quizStore.isEditMode"
      type="button"
      class="reset-button btn btn-sm"
      @click="resetRound"
    >
      Runde zurücksetzen
    </button>
  </aside>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { MAX_PLAYER_NAME_LENGTH } from '@/constants'
import { useQuizStore } from '@/stores/quiz.store'
import { confirmAction } from '@/utils/dialogs'

const quizStore = useQuizStore()

const newName = ref('')
const editingId = ref<string | null>(null)
const nameDraft = ref('')
const nameInputEl = ref<HTMLInputElement | null>(null)

const setNameInput = (el: unknown): void => {
  nameInputEl.value = el as HTMLInputElement | null
}

const addPlayer = (): void => {
  quizStore.addPlayer(newName.value)
  newName.value = ''
}

const startEditing = (id: string, name: string): void => {
  if (!quizStore.isEditMode) return
  editingId.value = id
  nameDraft.value = name
  nextTick(() => nameInputEl.value?.focus())
}

const saveName = (id: string): void => {
  if (editingId.value !== id) return
  quizStore.renamePlayer(id, nameDraft.value)
  editingId.value = null
}

const cancelName = (): void => {
  editingId.value = null
}

const resetRound = (): void => {
  if (confirmAction('Punkte aller Spieler auf 0 setzen und alle Karten wieder freigeben?')) {
    quizStore.resetRound()
  }
}
</script>

<style scoped>
.player-panel {
  position: sticky;
  top: 1rem;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 15rem;
  flex-shrink: 0;
  padding: 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.panel-title {
  margin: 0;
  font-size: 1.05rem;
}
.empty-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.7;
}
.player-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.player-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.55rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.player-item.is-buzzed {
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
.player-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.player-name.editable {
  cursor: pointer;
}
.player-name.editable:hover {
  text-decoration: underline;
}
.player-score {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--color-primary);
}
.name-input {
  flex: 1;
  min-width: 0;
  font: inherit;
  padding: 0.35rem 0.5rem;
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.add-form {
  display: flex;
  gap: 0.4rem;
}
.delete-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.75rem;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}
.delete-button:hover {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.delete-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
