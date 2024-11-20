<template>
  <div class="row-container">
    <div v-for="(item) in themes" :key="item">
      <ThemeColumn :header-text="item"></ThemeColumn>
    </div>
    <button class="addColumnButton" @click="addColumn">+</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ThemeColumn from './ThemeColumn.vue';

const themes = ref(["Test", "Test2"])

function addColumn(){
  themes.value.push("new");
}

</script>

<style scoped>
  .row-container {
    text-align: center;
    /*width: 100%;*/
    display: flex;
    flex-direction: row;
    justify-content: space-around;
  }
  .addColumnButton{
    height: 2rem;
    width: 2rem;
  }
</style>