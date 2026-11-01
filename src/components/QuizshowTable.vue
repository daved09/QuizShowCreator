<template>
  <div class="row-container">
    <div v-for="theme in quizStore.themes" :key="theme.id">
      <ThemeColumn :theme="theme" @card-clicked="openCard"></ThemeColumn>
    </div>
  </div>

  <QuestionModal
    v-if="selected"
    :mode="mode"
    :theme-text="selected.theme.themeText"
    :question="selected.question"
    :answered-by="answeredBy"
    :revealed="quizStore.answerRevealed"
    :key="`${selected.theme.id}-${selected.question.points}`"
    @update:revealed="(value) => quizStore.setAnswerRevealed(value ?? false)"
    @close="closeCard"
    @save="saveCard"
    @award="awardCard"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ThemeColumn from './ThemeColumn.vue'
import QuestionModal from './QuestionModal.vue'
import { findQuestion, findTheme } from '@/quiz/card'
import { useQuizStore } from '@/stores/quiz.store'
import type { OpenCard, QuestionContent } from '@/types/quiz'
import { usePermissions } from '@/composables/usePermissions'

const quizStore = useQuizStore()
const { canControl, canEdit } = usePermissions()

const mode = computed(() => (canEdit.value ? 'edit' : 'view'))

// The card being edited is local UI state. Only cards opened while playing
// become the store's `openCard`, which is what the host shares with viewers.
const editingCard = ref<OpenCard | null>(null)
const activeCard = computed(() => (canEdit.value ? editingCard.value : quizStore.openCard))

// Leaving edit mode (or losing edit rights) discards the edit dialog.
watch(canEdit, () => {
  editingCard.value = null
})

const selected = computed(() => {
  const current = activeCard.value
  if (!current) return null
  const theme = findTheme(quizStore.themes, current.themeId)
  const question = findQuestion(quizStore.themes, current.themeId, current.points)
  if (!theme || !question) return null
  return { theme, question }
})

const answeredBy = computed(() => {
  const current = activeCard.value
  if (!current) return null
  return quizStore.getAnsweredBy(current.themeId, current.points)
})

const openCard = (themeId: string, points: number): void => {
  // Viewers only watch: which question is open is driven by the host.
  if (!canControl.value) return
  if (canEdit.value) {
    editingCard.value = { themeId, points }
  } else {
    quizStore.openQuestion(themeId, points)
  }
}

const closeCard = (): void => {
  if (!canControl.value) return
  if (canEdit.value) {
    editingCard.value = null
  } else {
    quizStore.closeQuestion()
  }
}

const saveCard = (content: QuestionContent): void => {
  const current = editingCard.value
  if (!current) return
  quizStore.updateQuestionContent(current.themeId, current.points, content)
  editingCard.value = null
}

const awardCard = (playerId: string): void => {
  const current = quizStore.openCard
  if (!current) return
  const ok = quizStore.awardPointsForCard(playerId, current.themeId, current.points)
  if (ok) {
    quizStore.closeQuestion()
  }
}
</script>

<style scoped>
.row-container {
  text-align: center;
  /* width: 100%; */
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  gap: 2rem;
  padding: 0.5rem 1rem;
}
</style>
