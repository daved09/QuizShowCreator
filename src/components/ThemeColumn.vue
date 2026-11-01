<template>
  <div>
    <div v-if="!editingHeader" class="theme-header-row">
      <h3
        class="theme-header"
        :class="{ editable: quizStore.isEditMode }"
        @click="startEditingHeader"
      >
        {{ theme.themeText }}
      </h3>
      <button
        v-if="quizStore.isEditMode"
        class="delete-button"
        @click="deleteTheme"
        title="Thema löschen"
      >
        ✖
      </button>
    </div>
    <input
      v-else
      ref="headerInputEl"
      v-model="headerDraft"
      class="theme-header-input"
      @keydown.enter="saveHeader"
      @keydown.esc="cancelHeader"
      @blur="saveHeader"
      :maxlength="MAX_THEME_NAME_LENGTH"
    />
    <div v-for="q in theme.questions" :key="q.points" class="column-container">
      <point-button
        @point-button-clicked="emit('cardClicked', theme.id, q.points)"
        :points="q.points"
        :edit-mode="quizStore.isEditMode"
        :answered="quizStore.isAnswered(theme.id, q.points)"
        :answered-by="quizStore.getAnsweredBy(theme.id, q.points)"
        :has-image="!!q.image"
        :has-audio="!!q.audio"
      ></point-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import PointButton from './PointButton.vue'
import { MAX_THEME_NAME_LENGTH } from '@/constants'
import { useQuizStore } from '@/stores/quiz.store'
import type { Theme } from '@/types/quiz'
const props = defineProps<{ theme: Theme }>()

const emit = defineEmits<{
  (e: 'cardClicked', themeId: string, points: number): void
}>()

const quizStore = useQuizStore()

// Header editing
const editingHeader = ref<boolean>(false)
const headerDraft = ref<string>(props.theme.themeText)
const headerInputEl = ref<HTMLInputElement | null>(null)

const startEditingHeader = (): void => {
  if (!quizStore.isEditMode) return
  headerDraft.value = props.theme.themeText
  editingHeader.value = true
  nextTick(() => headerInputEl.value?.focus())
}

const saveHeader = (): void => {
  if (!editingHeader.value) return
  const newText = headerDraft.value.trim()
  if (newText && newText !== props.theme.themeText) {
    quizStore.updateThemeText(props.theme.id, newText)
  }
  editingHeader.value = false
}

const cancelHeader = (): void => {
  editingHeader.value = false
  headerDraft.value = props.theme.themeText
}

// Discard an in-progress edit when leaving edit mode
watch(
  () => quizStore.isEditMode,
  (isEdit) => {
    if (!isEdit && editingHeader.value) {
      cancelHeader()
    }
  },
)

const deleteTheme = (): void => {
  if (confirm(`'${props.theme.themeText}' wirklich löschen?`)) {
    quizStore.removeTheme(props.theme.id)
  }
}
</script>
<style scoped>
.column-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.theme-header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.theme-header {
  margin-bottom: 0.75rem;
}
.theme-header.editable {
  cursor: pointer;
}
.delete-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  margin-bottom: 0.75rem;
  color: var(--color-text);
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
.theme-header.editable:hover {
  text-decoration: underline;
}
.theme-header-input {
  width: 100%;
  font-size: 1.17em;
  font-weight: bold;
  text-align: center;
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
}
</style>
