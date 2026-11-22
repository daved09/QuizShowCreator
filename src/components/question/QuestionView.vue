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
    <ol v-if="question.choices" class="choice-list">
      <li
        v-for="(choice, index) in question.choices"
        :style="{ '--i': index }"
        :key="index"
        class="choice"
        :class="{ 'is-correct': revealed && choice === question.answer }"
      >
        <span class="choice-letter">{{ String.fromCharCode(65 + index) }}</span>
        <span class="choice-text">{{ choice }}</span>
        <span v-if="revealed && choice === question.answer" class="choice-mark"
          ><AppIcon name="check"
        /></span>
      </li>
    </ol>
    <div v-if="buzzedPlayer" class="buzzer-banner" role="status">
      <span class="buzzer-banner__icon" aria-hidden="true"><AppIcon name="notifications" /></span>
      <span class="buzzer-banner__text">{{ buzzedPlayer.name }} hat gebuzzert!</span>
      <button v-if="canControl" type="button" class="btn btn-sm" @click="quizStore.clearBuzz()">
        Buzzer freigeben
      </button>
    </div>
    <button v-else-if="canBuzz" type="button" class="buzzer-button" @click="networkStore.buzz()">
      BUZZER
    </button>

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
      <p v-if="answeredBy" class="award-hint">
        <AppIcon name="check" /> Bereits beantwortet von {{ answeredBy }}
      </p>
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
import AppIcon from '@/components/base/AppIcon.vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { usePermissions } from '@/composables/usePermissions'
import { useNetworkStore } from '@/stores/network.store'
import { useQuizStore } from '@/stores/quiz.store'
import type { Question } from '@/types/quiz'

const props = defineProps<{
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
const networkStore = useNetworkStore()
const { canControl } = usePermissions()

const buzzedPlayer = computed(
  () => quizStore.players.find((player) => player.id === quizStore.buzzedBy) ?? null,
)
// Only connected viewers that joined with a name can buzz.
const canBuzz = computed(
  () =>
    props.question.buzzEnabled !== false &&
    networkStore.isClient &&
    networkStore.status === 'connected' &&
    !!networkStore.playerName,
)

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
  border-radius: var(--md-sys-shape-md);
  cursor: zoom-in;
}
.view-audio {
  width: 100%;
}
.choice-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.5rem;
  margin: 0 0 0.5rem;
  padding: 0;
  list-style: none;
}
.choice {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.85rem;
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container-highest);
  border-radius: var(--md-sys-shape-md);
}
.choice.is-correct {
  color: var(--md-sys-color-on-primary-container);
  background: var(--md-sys-color-primary-container);
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
  font-weight: 500;
}
.choice-letter {
  flex-shrink: 0;
  font-weight: 500;
  color: var(--md-sys-color-primary);
}
.choice-text {
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.buzzer-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.85rem;
  font-weight: 500;
  color: var(--md-sys-color-on-tertiary-container);
  background: var(--md-sys-color-tertiary-container);
  border-radius: var(--md-sys-shape-lg);
}
.buzzer-banner__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buzzer-button {
  align-self: center;
  width: 9rem;
  height: 9rem;
  font: inherit;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--md-sys-color-on-error);
  background: var(--md-sys-color-error);
  border: none;
  border-radius: 50%;
  box-shadow: var(--md-sys-elevation-3);
  cursor: pointer;
  transition: transform var(--transition-fast);
}
.buzzer-button:active {
  transform: scale(0.95);
}
.buzzer-button:focus-visible {
  outline: 3px solid var(--md-sys-color-primary);
  outline-offset: 3px;
}
.reveal-button {
  align-self: flex-start;
}
.award-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}
.award-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--md-sys-color-on-surface-variant);
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
  color: var(--md-sys-color-primary);
  font-variant-numeric: tabular-nums;
}
.choice {
  animation: md-scale-in var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized)
    calc(var(--i, 0) * 80ms) both;
  transition:
    background-color var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing),
    box-shadow var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing);
}
.choice-mark {
  animation: md-pop var(--md-sys-motion-duration-long) var(--md-sys-motion-easing) both;
}
.buzzer-banner {
  animation: md-scale-in var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized)
    both;
}
.award-section {
  animation: md-fade-in var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing) both;
}
@media (prefers-reduced-motion: no-preference) {
  .buzzer-button {
    animation: buzzer-pulse 2s ease-in-out infinite;
  }
}
@keyframes buzzer-pulse {
  0%,
  100% {
    box-shadow:
      var(--md-sys-elevation-3),
      0 0 0 0 color-mix(in srgb, var(--md-sys-color-error) 45%, transparent);
  }
  50% {
    box-shadow:
      var(--md-sys-elevation-3),
      0 0 0 14px color-mix(in srgb, var(--md-sys-color-error) 0%, transparent);
  }
}
</style>
