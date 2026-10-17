<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog" role="dialog" aria-modal="true" :aria-label="dialogTitle">
      <header class="modal-header">
        <h2>{{ dialogTitle }}</h2>
        <button class="modal-close" @click="emit('close')" title="Schließen">✖</button>
      </header>

      <!-- View-Modus (Spielen): Frage + Antwort nur anzeigen -->
      <div v-if="mode === 'view'" class="modal-body">
        <p class="label">Frage:</p>
        <p class="view-text">{{ question.question || "—" }}</p>
        <p class="label">Antwort:</p>
        <p class="view-text">{{ question.answer || "—" }}</p>
        <div class="modal-actions">
          <button class="primary" @click="emit('close')" ref="closeButtonEl">Schließen</button>
        </div>
      </div>

      <!-- Edit-Modus: Fragetext + Punkte + Antwort formulieren -->
      <form v-else class="modal-body" @submit.prevent="onSave">
        <label class="field">
          <span class="label">Punkte</span>
          <input
            ref="firstFieldEl"
            v-model.number="draft.points"
            type="number"
            step="1"
            required
            class="text-input"
          />
        </label>
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

const props = defineProps<{
  mode: 'view' | 'edit'
  themeText: string
  question: Question
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { points: number; question: string; answer: string }): void
}>()

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
      closeButtonEl.value?.focus()
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
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text);
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
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.modal-actions .primary {
  font-weight: bold;
}
</style>
