<template>
  <form class="modal-body" @submit.prevent="onSave">
    <label class="field">
      <span class="label">Frage</span>
      <textarea
        ref="questionInputEl"
        v-model="draft.question"
        :maxlength="MAX_QUESTION_LENGTH"
        rows="4"
        placeholder="Frage formulieren …"
        class="text-input"
        :class="{ 'is-dragging': isDragging }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @paste="onPaste"
      />
      <small v-if="!draft.image && !draft.audio" class="image-hint">
        Bild oder Audiodatei zum Hinzufügen hierher ziehen oder einfügen.
      </small>
    </label>
    <p v-if="imageError" class="error">{{ imageError }}</p>
    <div v-if="draft.image" class="field">
      <span class="label">Bild</span>
      <img :src="draft.image" alt="Bildvorschau" class="image-preview" />
      <button type="button" class="remove-image btn btn-danger btn-sm" @click="removeImage">
        Bild entfernen
      </button>
    </div>
    <p v-if="audioError" class="error">{{ audioError }}</p>
    <div v-if="draft.audio" class="field">
      <span class="label">Audio</span>
      <audio :src="draft.audio" controls class="audio-preview"></audio>
      <button type="button" class="remove-audio btn btn-danger btn-sm" @click="removeAudio">
        Audio entfernen
      </button>
    </div>
    <label class="field">
      <span class="label">Antwort</span>
      <textarea
        v-model="draft.answer"
        rows="3"
        :maxlength="MAX_ANSWER_LENGTH"
        placeholder="Antwort …"
        class="text-input"
      />
    </label>
    <div class="modal-actions">
      <button type="button" class="btn" @click="emit('cancel')">Abbrechen</button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useMediaDrop } from '@/composables/useMediaDrop'
import { MAX_ANSWER_LENGTH, MAX_QUESTION_LENGTH } from '@/constants'
import type { Question, QuestionContent } from '@/types/quiz'

const props = defineProps<{ question: Question }>()

const emit = defineEmits<{
  (e: 'save', value: QuestionContent): void
  (e: 'cancel'): void
}>()

const draft = reactive({
  question: props.question.question,
  answer: props.question.answer,
  image: props.question.image ?? '',
  audio: props.question.audio ?? '',
})

const {
  imageError,
  audioError,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  removeImage,
  removeAudio,
} = useMediaDrop(draft)

const questionInputEl = ref<HTMLTextAreaElement | null>(null)

const onSave = (): void => {
  emit('save', {
    question: draft.question.trim(),
    answer: draft.answer.trim(),
    image: draft.image || undefined,
    audio: draft.audio || undefined,
  })
}

onMounted(() => {
  nextTick(() => questionInputEl.value?.focus())
})
</script>

<style scoped>
.text-input.is-dragging {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 0 0 2px var(--color-primary-soft);
}
.image-preview {
  max-width: 100%;
  max-height: 12rem;
  object-fit: contain;
  border-radius: 0.25rem;
}
.image-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  opacity: 0.7;
}
.remove-image,
.remove-audio {
  align-self: flex-start;
}
.audio-preview {
  width: 100%;
}
</style>
