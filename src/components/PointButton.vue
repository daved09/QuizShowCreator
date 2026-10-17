<template>
  <div>
    <button :class="{ 'edit-mode': editMode }" @click="test">{{ editMode ? `${points} ✏️` : points }}</button>
     <!-- <button>test</button> -->
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  points: number
  editMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'pointButtonClicked', value: number): void
}>()

const test = (): void => {
  emit('pointButtonClicked', props.points)
}
</script>

<style scoped>
button {
  width: 6rem;
  height: 3.5rem;
  margin: 0.5rem;
  font-size: 1.15rem;
  border-color: black;
  background-color: lightgray;
  &:hover{
    background-color: yellow;
  }
}
button.edit-mode {
  border-style: dashed;
  background-color: #eef4ff;
}
</style>