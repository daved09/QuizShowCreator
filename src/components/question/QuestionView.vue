<template>
  <div class="modal-body">
    <p class="label">Frage:</p>
    <p class="view-text">{{ question.question || '—' }}</p>
    <img
      v-if="question.image"
      :src="question.image"
      alt="Frage-Bild"
      class="view-image"
      title="Zum Vergrößern klicken"
      @click="emit('zoomImage')"
    />
    <audio v-if="question.audio" :src="question.audio" controls class="view-audio"></audio>
    <p class="label">Antwort:</p>
    <p v-if="revealed" class="view-text">{{ question.answer || '—' }}</p>
    <button
      v-if="canControl"
      ref="revealButtonEl"
      type="button"
      class="reveal-button btn"
      @click="emit('toggleReveal')"
    >
      {{ revealed ? 'Antwort verbergen' : 'Antwort anzeigen' }}
    </button>

    <div v-if="revealed && canControl" class="award-section">
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
          class="award-button btn"
          @click="emit('award', player.id)"
        >
          <span class="award-name">{{ player.name }}</span>
          <span class="award-points">+{{ question.points }}</span>
        </button>
      </div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-primary" @click="emit('close')">Schließen</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { usePermissions } from '@/composables/usePermissions'
import { useQuizStore } from '@/stores/quiz.store'
import type { Question } from '@/types/quiz'

defineProps<{
  question: Question
  revealed: boolean
  answeredBy?: string | null
}>()

const emit = defineEmits<{
  (e: 'toggleReveal'): void
  (e: 'award', playerId: string): void
  (e: 'zoomImage'): void
  (e: 'close'): void
}>()

const quizStore = useQuizStore()
const { canControl } = usePermissions()

const revealButtonEl = ref<HTMLButtonElement | null>(null)

onMounted(() => {
  nextTick(() => revealButtonEl.value?.focus())
})
</script>

<style scoped>
.view-text {
  margin: 0 0 0.5rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.view-image {
  align-self: center;
  max-width: 100%;
  max-height: 45vh;
  object-fit: contain;
  border-radius: 0.25rem;
  cursor: zoom-in;
}
.view-audio {
  width: 100%;
}
.reveal-button {
  align-self: flex-start;
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
  padding: 0.5rem 0.85rem;
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
</style>
