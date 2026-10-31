<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog" role="dialog" aria-modal="true" :aria-label="dialogTitle">
      <header class="modal-header">
        <h2>{{ dialogTitle }}</h2>
        <button class="modal-close" @click="emit('close')" title="Schließen">✖</button>
      </header>

      <!-- View mode (playing): question + answer + awarding points -->
      <div v-if="mode === 'view'" class="modal-body">
        <p class="label">Frage:</p>
        <p class="view-text">{{ question.question || "—" }}</p>
        <img
          v-if="question.image"
          :src="question.image"
          alt="Frage-Bild"
          class="view-image"
          title="Zum Vergrößern klicken"
          @click="showLightbox = true"
        />
        <audio
          v-if="question.audio"
          :src="question.audio"
          controls
          class="view-audio"
        ></audio>
        <p class="label">Antwort:</p>
        <p v-if="isRevealed" class="view-text">{{ question.answer || "—" }}</p>
        <button
          v-if="isHost"
          type="button"
          class="reveal-button"
          ref="revealButtonEl"
          @click="toggleReveal"
        >
          {{ isRevealed ? 'Antwort verbergen' : 'Antwort anzeigen' }}
        </button>

        <div v-if="isRevealed && !networkStore.isClient" class="award-section">
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

      <!-- Edit mode: compose question text + points + answer -->
      <form v-else class="modal-body" @submit.prevent="onSave">
        <label class="field">
          <span class="label">Frage</span>
          <textarea
            v-model="draft.question"
            maxlength="500"
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
          <button type="button" class="remove-image" @click="removeImage">
            Bild entfernen
          </button>
        </div>
        <p v-if="audioError" class="error">{{ audioError }}</p>
        <div v-if="draft.audio" class="field">
          <span class="label">Audio</span>
          <audio :src="draft.audio" controls class="audio-preview"></audio>
          <button type="button" class="remove-audio" @click="removeAudio">
            Audio entfernen
          </button>
        </div>
        <label class="field">
          <span class="label">Antwort</span>
          <textarea
            v-model="draft.answer"
            rows="3"
            maxlength="250"
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

    <!-- Fullscreen view of the question image -->
    <div
      v-if="showLightbox && question.image"
      class="lightbox"
      @click="showLightbox = false"
    >
      <img :src="question.image" alt="Frage-Bild groß" class="lightbox-image" />
      <button class="lightbox-close" @click.stop="showLightbox = false" title="Schließen">
        ✖
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import type { Question } from '@/stores/quiz.store'
import { useQuizStore } from '@/stores/quiz.store'
import { useNetworkStore } from '@/stores/network.store'
import { fileToImageDataUrl, isImageFile } from '@/utils/image'
import { fileToAudioDataUrl, isAudioFile } from '@/utils/audio'

const props = defineProps<{
  mode: 'view' | 'edit'
  themeText: string
  question: Question
  answeredBy?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: { points: number; question: string; answer: string; image?: string; audio?: string }): void
  (e: 'award', playerId: string): void
}>()

const quizStore = useQuizStore()
const networkStore = useNetworkStore()

const dialogTitle = computed(() =>
  props.mode === 'edit'
    ? `Karte bearbeiten – ${props.themeText} (${props.question.points})`
    : `${props.themeText} – ${props.question.points} Punkte`,
)

const draft = reactive({
  points: props.question.points,
  question: props.question.question,
  answer: props.question.answer,
  image: props.question.image ?? "",
  audio: props.question.audio ?? "",
})
const error = ref<string>("")
const imageError = ref<string>("")
const audioError = ref<string>("")
const isDragging = ref<boolean>(false)
const showLightbox = ref<boolean>(false)
const firstFieldEl = ref<HTMLInputElement | null>(null)
const closeButtonEl = ref<HTMLButtonElement | null>(null)
const revealButtonEl = ref<HTMLButtonElement | null>(null)

// The revealed state is a model so the host stays in control and it can be
// synced to viewers. Unbound, it behaves like local state.
const revealed = defineModel<boolean | undefined>('revealed', { default: undefined })
// Hide the answer in view mode by default; already answered cards show it directly.
const isRevealed = computed(() => revealed.value ?? !!props.answeredBy)

// Checks if the client is host or client
const isHost = computed(() => {
  if(networkStore.isOnline && networkStore.isHost){
    return true;
  }
  if(networkStore.isOnline && networkStore.isClient){
    return false;
  }
  return true;
})

const toggleReveal = (): void => {
  revealed.value = !isRevealed.value
}

const setImageFromFile = async (file: File | undefined): Promise<void> => {
  if (!file) return
  imageError.value = ""
  try {
    draft.image = await fileToImageDataUrl(file)
  } catch (err) {
    imageError.value = err instanceof Error ? err.message : "Bild konnte nicht geladen werden."
  }
}

const setAudioFromFile = async (file: File | undefined): Promise<void> => {
  if (!file) return
  audioError.value = ""
  try {
    draft.audio = await fileToAudioDataUrl(file)
  } catch (err) {
    audioError.value = err instanceof Error ? err.message : "Audiodatei konnte nicht geladen werden."
  }
}

// Route a dropped/pasted file to image or audio based on its type.
const applyFile = (file: File): void => {
  if (isImageFile(file)) {
    void setImageFromFile(file)
  } else if (isAudioFile(file)) {
    void setAudioFromFile(file)
  } else {
    imageError.value = "Bitte eine Bild- oder Audiodatei auswählen."
  }
}

const hasFiles = (dataTransfer: DataTransfer | null): boolean =>
  !!dataTransfer && Array.from(dataTransfer.types).includes('Files')

const onDragOver = (event: DragEvent): void => {
  // Only intercept file drags; normal text drag & drop in the field stays possible.
  if (hasFiles(event.dataTransfer)) {
    event.preventDefault()
    isDragging.value = true
  }
}

const onDragLeave = (): void => {
  isDragging.value = false
}

const onDrop = (event: DragEvent): void => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  event.preventDefault()
  applyFile(files[0])
}

const onPaste = (event: ClipboardEvent): void => {
  const items = event.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (
      item.kind === 'file' &&
      (item.type.startsWith('image/') || item.type.startsWith('audio/'))
    ) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        applyFile(file)
        return
      }
    }
  }
}

const removeImage = (): void => {
  draft.image = ""
  imageError.value = ""
}

const removeAudio = (): void => {
  draft.audio = ""
  audioError.value = ""
}

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
    image: draft.image || undefined,
    audio: draft.audio || undefined,
  })
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    if (showLightbox.value) {
      showLightbox.value = false
      return
    }
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
.view-image {
  align-self: center;
  max-width: 100%;
  max-height: 45vh;
  object-fit: contain;
  border-radius: 0.25rem;
  cursor: zoom-in;
}
.text-input:focus,
.text-input:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-soft);
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
  font: inherit;
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.remove-image:hover,
.remove-audio:hover {
  border-color: var(--color-danger);
}
.audio-preview,
.view-audio {
  width: 100%;
}
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
