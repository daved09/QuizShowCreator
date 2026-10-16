<template>
  <div class="row-container">
    <div v-for="(theme) in quizStore.themes" :key="theme.id">
      <ThemeColumn :theme="theme"></ThemeColumn>
    </div>
    <button class="addColumnButton" @click="addColumn">+</button>
  </div>
</template>

<script setup lang="ts">
import ThemeColumn from './ThemeColumn.vue';
import { useQuizStore } from '@/stores/quiz.store';

const quizStore = useQuizStore();

function addColumn(): void {
	quizStore.addColumn("New from store");
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
  .addColumnButton{
    height: 3rem;
    width: 3rem;
  }
</style>
