<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog" role="dialog" aria-modal="true" :aria-label="dialogTitle">
      <header class="modal-header">
        <h2>{{ dialogTitle }}</h2>
        <button class="modal-close" @click="emit('close')" title="Schließen">✖</button>
      </header>

      <!-- View-Modus (Spielen): Frage + Antwort + Punkte vergeben -->
      <div v-if="mode === 'view'" class="modal-body">
        <p class="label">Frage:</p>
        <p class="view-text">{{ question.question || "—" }}</p>
        <p class="label">Antwort:</p>
        <p v-if="revealed" class="view-text">{{ question.answer || "—" }}</p>
        <button
          type="button"
          class="reveal-button"
          ref="revealButtonEl"
          @click="revealed = !revealed"
        >
          {{ revealed ? 'Antwort verbergen' : 'Antwort anzeigen' }}
        </button>

        <div v-if="revealed" class="award-section">
          <p class="label">Punkte vergeben</p>
          <p v-if="answeredBy" class="award-hint">✔ Bereits beantwortet von {{ answeredBy }}</p>
          <p v-else-if="quizStore.players.length === 0" class="award-hint">
            Noch keine Spieler angelegt.
          </p>
          <div v-else class="award-list">
            <button
              v-for="player in quizStore.players"
              :key="player.id"
              type="button"
              class="award-button"
              @click="emit('award', player.id)"
            >
              <span class="award-name">{{ player.name }}</span>
              <span class="award-points">+{{ question.points }}</span>
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="primary" @click="emit('close')" ref="closeButtonEl">Schließen</button>
        </div>
      </div>

      <!-- Edit-Modus: Fragetext + Punkte + Antwort formulieren -->
      <form v-else class="modal-body" @submit.prevent="onSave">
        <label class="field">
          <span class="label">Frage</span>
          <textarea
            v-model="draft.question"
            rows="4"
            placeholder="Frage formulieren …"
            class="text-input"
          />
        </label>
        <label class="field">
          <span class="label">Antwort</span>
          <textarea
            v-model="draft.answer"
            rows="3"
            placeholder="Antwort …"
            class="text-input"
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" @click="emit('close')">Abbrechen</button>
          <button type="submit" class="primary">Speichern</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import type { Question } from '@/stores/quiz.store'
import { useQuizStore } from '@/stores/quiz.store'

const props = defineProps<{
  mode: 'view' | 'edit'
  themeText: string
  question: Question
  answeredBy?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { points: number; question: string; answer: string }): void
  (e: 'award', playerId: string): void
}>()

const quizStore = useQuizStore()

const dialogTitle = computed(() =>
  props.mode === 'edit'
    ? `Karte bearbeiten – ${props.themeText} (${props.question.points})`
    : `${props.themeText} – ${props.question.points} Punkte`,
)

const draft = reactive({
  points: props.question.points,
  question: props.question.question,
  answer: props.question.answer,
})
const error = ref<string>("")
const firstFieldEl = ref<HTMLInputElement | null>(null)
const closeButtonEl = ref<HTMLButtonElement | null>(null)
const revealButtonEl = ref<HTMLButtonElement | null>(null)

// Antwort im View-Modus standardmäßig verbergen; bereits beantwortete Karten zeigen sie direkt.
const revealed = ref<boolean>(!!props.answeredBy)

const onSave = (): void => {
  error.value = ""
  if (!Number.isInteger(draft.points)) {
    error.value = "Bitte eine ganze Punktzahl eingeben."
    return
  }
  emit('save', {
    points: draft.points,
    question: draft.question.trim(),
    answer: draft.answer.trim(),
  })
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  nextTick(() => {
    if (props.mode === 'edit') {
      firstFieldEl.value?.focus()
    } else {
      revealButtonEl.value?.focus()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal-dialog {
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  width: min(32rem, 100%);
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}
.modal-header h2 {
  font-size: 1.1rem;
  margin: 0;
}
.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}
.modal-close:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.modal-close:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.label {
  font-weight: bold;
  font-size: 0.9rem;
  margin: 0;
}
.view-text {
  margin: 0 0 0.5rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.reveal-button {
  align-self: flex-start;
  font: inherit;
  padding: 0.5rem 1rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}
.reveal-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.reveal-button:active {
  transform: translateY(1px) scale(0.99);
}
.reveal-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.award-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}
.award-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.8;
}
.award-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.award-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font: inherit;
  padding: 0.5rem 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}
.award-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.award-button:active {
  transform: translateY(1px) scale(0.99);
}
.award-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.award-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.award-points {
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.text-input {
  font: inherit;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  background: var(--color-background-soft);
  color: var(--color-text);
  width: 100%;
  resize: vertical;
}
.error {
  color: red;
  font-size: 0.9rem;
  margin: 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.modal-actions button {
  font: inherit;
  padding: 0.55rem 1.15rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}
.modal-actions button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.modal-actions button:active {
  transform: translateY(1px) scale(0.99);
}
.modal-actions button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.modal-actions .primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: transparent;
  box-shadow: var(--shadow-sm);
}
.modal-actions .primary:hover {
  color: var(--color-on-primary);
  background: var(--color-primary-hover);
  border-color: transparent;
  box-shadow: var(--shadow-md);
}
</style>
