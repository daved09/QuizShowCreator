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
        <AppIcon name="close" />
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
import AppIcon from '@/components/base/AppIcon.vue'
import { nextTick, ref, watch } from 'vue'
import PointButton from './PointButton.vue'
import { MAX_THEME_NAME_LENGTH } from '@/constants'
import { useQuizStore } from '@/stores/quiz.store'
import { confirmAction } from '@/utils/dialogs'
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
  if (confirmAction(`'${props.theme.themeText}' wirklich löschen?`)) {
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
  /* title-large */
  font-size: 22px;
  line-height: 28px;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}
.theme-header.editable {
  cursor: pointer;
}
.theme-header.editable:hover {
  text-decoration: underline;
}
.delete-button {
  width: 32px;
  height: 32px;
  margin-bottom: 0.75rem;
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
.theme-header-input {
  width: 100%;
  margin-bottom: 0.75rem;
  padding: 0.25rem 0.5rem;
  font: inherit;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
  color: var(--md-sys-color-on-surface);
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-xs);
}
.theme-header-input:focus {
  outline: none;
  border-color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
}
</style>
