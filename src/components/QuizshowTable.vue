<template>
  <div class="row-container">
    <div v-for="(theme) in quizStore.themes" :key="theme.id">
      <ThemeColumn :theme="theme" @cardClicked="openCard"></ThemeColumn>
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
import { computed } from 'vue';
import ThemeColumn from './ThemeColumn.vue';
import QuestionModal from './QuestionModal.vue';
import { useQuizStore } from '@/stores/quiz.store';
import { useNetworkStore } from '@/stores/network.store';

const quizStore = useQuizStore();
const networkStore = useNetworkStore();

const mode = computed(() => (quizStore.isEditMode && !networkStore.isClient ? 'edit' : 'view'));

const selected = computed(() => {
  const current = quizStore.openCard;
  if (!current) return null;
  const theme = quizStore.themes.find(t => t.id === current.themeId);
  if (!theme) return null;
  const question = theme.questions.find(q => q.points === current.points);
  if (!question) return null;
  return { theme, question };
});

const answeredBy = computed(() => {
  const current = quizStore.openCard;
  if (!current) return null;
  return quizStore.getAnsweredBy(current.themeId, current.points);
});

const openCard = (themeId: string, points: number): void => {
  // Viewers only watch: which question is open is driven by the host.
  if (networkStore.isClient) return;
  quizStore.openQuestion(themeId, points);
}

const closeCard = (): void => {
  if (networkStore.isClient) return;
  quizStore.closeQuestion();
}

const saveCard = (data: { points: number; question: string; answer: string; image?: string; audio?: string }): void => {
  const current = quizStore.openCard;
  if (!current) return;
  const ok = quizStore.updateQuestionFull(current.themeId, current.points, data);
  if (!ok) {
    alert('Diese Punktzahl existiert in dieser Spalte bereits.');
    return;
  }
  quizStore.closeQuestion();
}

const awardCard = (playerId: string): void => {
  const current = quizStore.openCard;
  if (!current) return;
  const ok = quizStore.awardPointsForCard(playerId, current.themeId, current.points);
  if (ok) {
    quizStore.closeQuestion();
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
