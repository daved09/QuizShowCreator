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
    <label class="field field-inline">
      <input v-model="draft.multipleChoice" type="checkbox" class="switch" />
      <span class="label">Multiple Choice</span>
    </label>
    <fieldset v-if="draft.multipleChoice" class="field choices">
      <legend class="label">Antwortmöglichkeiten</legend>
      <small class="hint">Die richtige Antwort per Auswahlknopf markieren.</small>
      <div v-for="(_, index) in draft.choices" :key="index" class="choice-row">
        <input
          v-model="draft.correctIndex"
          type="radio"
          name="correct-choice"
          :value="index"
          :aria-label="`Antwort ${choiceLetter(index)} ist richtig`"
          class="choice-correct"
        />
        <span class="choice-letter" aria-hidden="true">{{ choiceLetter(index) }}</span>
        <input
          v-model="draft.choices[index]"
          type="text"
          :maxlength="MAX_CHOICE_LENGTH"
          :placeholder="`Antwort ${choiceLetter(index)} …`"
          :aria-label="`Antwort ${choiceLetter(index)}`"
          class="text-input choice-input"
        />
        <button
          type="button"
          class="remove-choice btn btn-danger btn-sm"
          :disabled="draft.choices.length <= MIN_CHOICES"
          :aria-label="`Antwort ${choiceLetter(index)} entfernen`"
          @click="removeChoice(index)"
        >
          ✕
        </button>
      </div>
      <button
        v-if="draft.choices.length < MAX_CHOICES"
        type="button"
        class="add-choice btn btn-sm"
        @click="addChoice"
      >
        + Antwortmöglichkeit hinzufügen
      </button>
    </fieldset>
    <p v-if="choiceError" class="error">{{ choiceError }}</p>
    <label v-if="!draft.multipleChoice" class="field">
      <span class="label">Antwort</span>
      <textarea
        v-model="draft.answer"
        rows="3"
        :maxlength="MAX_ANSWER_LENGTH"
        placeholder="Antwort …"
        class="text-input"
      />
    </label>
    <label class="field field-inline">
      <input v-model="draft.buzzEnabled" type="checkbox" class="switch" />
      <span class="label">Buzzern erlauben</span>
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
import {
  MAX_ANSWER_LENGTH,
  MAX_CHOICE_LENGTH,
  MAX_CHOICES,
  MAX_QUESTION_LENGTH,
  MIN_CHOICES,
} from '@/constants'
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
  buzzEnabled: props.question.buzzEnabled !== false,
  multipleChoice: !!props.question.choices,
  // Open questions start with empty options, prefilled with their answer as the correct one.
  choices: props.question.choices
    ? [...props.question.choices]
    : [props.question.answer, ...Array<string>(MIN_CHOICES + 1).fill('')],
  correctIndex: Math.max(0, props.question.choices?.indexOf(props.question.answer) ?? 0),
})

const choiceError = ref('')

const choiceLetter = (index: number): string => String.fromCharCode(65 + index)

const addChoice = (): void => {
  if (draft.choices.length < MAX_CHOICES) draft.choices.push('')
}

const removeChoice = (index: number): void => {
  if (draft.choices.length <= MIN_CHOICES) return
  draft.choices.splice(index, 1)
  if (draft.correctIndex === index) draft.correctIndex = 0
  else if (draft.correctIndex > index) draft.correctIndex--
}

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

// The trimmed choices and the correct one, or an error message.
const collectChoices = (): { choices: string[]; answer: string } | string => {
  const correct = draft.choices[draft.correctIndex]?.trim() ?? ''
  if (!correct) return 'Die als richtig markierte Antwort darf nicht leer sein.'
  const choices = draft.choices.map((choice) => choice.trim()).filter(Boolean)
  if (choices.length < MIN_CHOICES) {
    return `Bitte mindestens ${MIN_CHOICES} Antwortmöglichkeiten angeben.`
  }
  if (new Set(choices).size !== choices.length) {
    return 'Die Antwortmöglichkeiten müssen sich unterscheiden.'
  }
  return { choices, answer: correct }
}

const onSave = (): void => {
  let answer = draft.answer.trim()
  let choices: string[] | undefined
  if (draft.multipleChoice) {
    const result = collectChoices()
    if (typeof result === 'string') {
      choiceError.value = result
      return
    }
    ;({ choices, answer } = result)
  }
  choiceError.value = ''
  emit('save', {
    question: draft.question.trim(),
    answer,
    choices,
    image: draft.image || undefined,
    audio: draft.audio || undefined,
    buzzEnabled: draft.buzzEnabled ? undefined : false,
  })
}

onMounted(() => {
  nextTick(() => questionInputEl.value?.focus())
})
</script>

<style scoped>
.choices {
  margin: 0;
  padding: 0;
  border: none;
  gap: 0.4rem;
}
.choices .label {
  padding: 0;
}
.choice-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.choice-correct {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.choice-letter {
  flex-shrink: 0;
  width: 1.2rem;
  font-weight: 700;
  text-align: center;
}
.choice-input {
  flex: 1;
  min-width: 0;
}
.add-choice {
  align-self: flex-start;
}
.field-inline {
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}
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
