<template>
  <div>
    <div class="row-container">
      <ThemeColumn header-text="Test"></ThemeColumn>
      <ThemeColumn header-text="Test"></ThemeColumn>
      <ThemeColumn header-text="Test"></ThemeColumn>
      <ThemeColumn header-text="Test"></ThemeColumn>
    </div>
  </div>
</template>

<script setup>
import ThemeColumn from './ThemeColumn.vue';


</script>

<style scoped>
  .row-container {
    text-align: center;
    /*width: 100%;*/
    display: flex;
    flex-direction: row;
    justify-content: space-around;
  }
</style>