<template>
  <div class="row-container">
    <div v-for="(theme) in quizStore.themes" :key="theme">
      <theme-column :header-text="theme"></theme-column>
    </div>
    <button class="addColumnButton" @click="addColumn">+</button>
  </div>
</template>

<script setup>
import ThemeColumn from './ThemeColumn.vue';
import { useQuizStore } from '@/stores/quiz.store';

const quizStore = useQuizStore();

function addColumn(){
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
  }
  .addColumnButton{
    height: 2rem;
    width: 2rem;
  }
</style>
