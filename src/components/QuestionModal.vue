<template>
  <BaseModal :title="dialogTitle" @close="requestClose">
    <QuestionView
      v-if="mode === 'view'"
      :question="question"
      :revealed="isRevealed"
      :answered-by="answeredBy"
      @toggle-reveal="toggleReveal"
      @award="(playerId) => emit('award', playerId)"
      @zoom-image="showLightbox = true"
      @close="emit('close')"
    />
    <QuestionEditor
      v-else
      :question="question"
      @save="(content) => emit('save', content)"
      @cancel="emit('close')"
    />

    <template #overlay>
      <!-- Fullscreen view of the question image -->
      <div v-if="showLightbox && question.image" class="lightbox" @click="showLightbox = false">
        <img :src="question.image" alt="Frage-Bild groß" class="lightbox-image" />
        <button class="lightbox-close" title="Schließen" @click.stop="showLightbox = false">
          ✖
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/components/base/BaseModal.vue'
import QuestionEditor from '@/components/question/QuestionEditor.vue'
import QuestionView from '@/components/question/QuestionView.vue'
import type { Question, QuestionContent } from '@/types/quiz'

const props = defineProps<{
  mode: 'view' | 'edit'
  themeText: string
  question: Question
  answeredBy?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: QuestionContent): void
  (e: 'award', playerId: string): void
}>()

const dialogTitle = computed(() =>
  props.mode === 'edit'
    ? `Karte bearbeiten – ${props.themeText} (${props.question.points})`
    : `${props.themeText} – ${props.question.points} Punkte`,
)

const showLightbox = ref(false)

// The revealed state is a model so the host stays in control and it can be
// synced to viewers. Unbound, it behaves like local state.
const revealed = defineModel<boolean | undefined>('revealed', { default: undefined })
// Hide the answer in view mode by default; already answered cards show it directly.
const isRevealed = computed(() => revealed.value ?? !!props.answeredBy)

const toggleReveal = (): void => {
  revealed.value = !isRevealed.value
}

// Escape, the close cross and the backdrop close the fullscreen image first.
const requestClose = (): void => {
  if (showLightbox.value) {
    showLightbox.value = false
    return
  }
  emit('close')
}
</script>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  z-index: 200;
  padding: 2rem;
  cursor: zoom-out;
}
.lightbox-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  font-size: 1rem;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
