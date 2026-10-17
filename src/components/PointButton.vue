<template>
  <button :class="{ 'edit-mode': editMode }" @click="test">
    <span>{{ points }}</span>
    <span v-if="editMode" class="edit-badge" aria-hidden="true">✏️</span>
  </button>
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 6rem;
  height: 3.5rem;
  margin: 0.5rem;
  font: inherit;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}
button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
button:active {
  transform: translateY(0) scale(0.98);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
button.edit-mode {
  border: 1.5px dashed var(--color-primary);
  background: var(--color-primary-soft);
}
.edit-badge {
  font-size: 0.75em;
  line-height: 1;
}
</style>
