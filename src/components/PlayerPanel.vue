<template>
  <aside class="player-panel">
    <h2 class="panel-title">Spieler</h2>

    <p v-if="quizStore.players.length === 0" class="empty-hint">Noch keine Spieler.</p>

    <TransitionGroup v-else name="list" tag="ul" class="player-list">
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
            <AppIcon name="close" />
          </button>
        </template>
        <span v-if="quizStore.buzzedBy === player.id" class="buzzed-icon" title="Hat gebuzzert">
          <AppIcon name="notifications" />
        </span>
        <span class="player-score">{{ player.score }}</span>
      </li>
    </TransitionGroup>

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
      <AppIcon name="restart_alt" />Runde zurücksetzen
    </button>
  </aside>
</template>

<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
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
/* Card (filled) */
.player-panel {
  position: sticky;
  top: 1rem;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 15rem;
  flex-shrink: 0;
  padding: 16px;
  background: var(--md-sys-color-surface-container-highest);
  border-radius: var(--md-sys-shape-md);
}
.panel-title {
  margin: 0;
  /* title-large */
  font-size: 22px;
  line-height: 28px;
}
.empty-hint {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
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
  min-height: 48px;
  padding: 4px 8px 4px 16px;
  background: var(--md-sys-color-surface-container-low);
  border-radius: var(--md-sys-shape-sm);
  transition: background-color var(--transition-fast);
}
.player-item.is-buzzed {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}
.player-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.player-name.editable {
  cursor: pointer;
}
.player-name.editable:hover {
  text-decoration: underline;
}
.player-score {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: var(--md-sys-color-primary);
}
.name-input {
  flex: 1;
  min-width: 0;
  font: inherit;
  padding: 0.35rem 0.5rem;
  color: var(--md-sys-color-on-surface);
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-xs);
}
.name-input:focus {
  outline: none;
  border-color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
}
.add-form {
  display: flex;
  gap: 0.4rem;
}
.delete-button {
  width: 32px;
  height: 32px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  padding: 0;
  border: none;
  border-radius: var(--md-sys-shape-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}
.delete-button:hover {
  color: var(--md-sys-color-on-error-container);
  background: var(--md-sys-color-error-container);
}
.delete-button:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
}
.list-enter-active,
.list-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.list-leave-active {
  position: absolute;
  width: calc(100% - 32px);
}
.list-move {
  transition: transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing);
}
.player-list {
  position: relative;
}
.buzzed-icon {
  display: inline-block;
  animation: bell-ring 900ms var(--md-sys-motion-easing) both;
}
@keyframes bell-ring {
  0%,
  100% {
    transform: rotate(0);
  }
  20% {
    transform: rotate(-20deg);
  }
  40% {
    transform: rotate(18deg);
  }
  60% {
    transform: rotate(-12deg);
  }
  80% {
    transform: rotate(8deg);
  }
}
</style>
