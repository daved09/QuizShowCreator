<template>
  <div class="row-container">
    <div v-for="(theme) in quizStore.themes" :key="theme.id">
      <ThemeColumn :theme="theme" @cardClicked="openCard"></ThemeColumn>
    </div>
  </div>

  <QuestionModal
    v-if="selected"
    :mode="quizStore.isEditMode ? 'edit' : 'view'"
    :theme-text="selected.theme.themeText"
    :question="selected.question"
    :key="`${selected.theme.id}-${selected.question.points}`"
    @close="closeCard"
    @save="saveCard"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ThemeColumn from './ThemeColumn.vue';
import QuestionModal from './QuestionModal.vue';
import { useQuizStore } from '@/stores/quiz.store';

const quizStore = useQuizStore();

const selectedThemeId = ref<string | null>(null);
const selectedPoints = ref<number | null>(null);

const selected = computed(() => {
  if (selectedThemeId.value === null || selectedPoints.value === null) return null;
  const theme = quizStore.themes.find(t => t.id === selectedThemeId.value);
  if (!theme) return null;
  const question = theme.questions.find(q => q.points === selectedPoints.value);
  if (!question) return null;
  return { theme, question };
});

const openCard = (themeId: string, points: number): void => {
  selectedThemeId.value = themeId;
  selectedPoints.value = points;
}

const closeCard = (): void => {
  selectedThemeId.value = null;
  selectedPoints.value = null;
}

const saveCard = (data: { points: number; question: string; answer: string }): void => {
  if (selectedThemeId.value === null || selectedPoints.value === null) return;
  const ok = quizStore.updateQuestionFull(selectedThemeId.value, selectedPoints.value, data);
  if (!ok) {
    alert('Diese Punktzahl existiert in dieser Spalte bereits.');
    return;
  }
  selectedPoints.value = data.points;
  closeCard();
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
