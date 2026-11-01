<template>
  <button
    :class="{ 'edit-mode': editMode, 'is-answered': answered }"
    :title="answered && answeredBy ? `Beantwortet von ${answeredBy}` : undefined"
    @click="test"
  >
    <span>{{ points }}</span>
    <span v-if="answered" class="answered-badge" aria-hidden="true">✔</span>
    <span v-else-if="editMode" class="edit-badge" aria-hidden="true">✏️</span>
    <template v-if="editMode">
      <span v-if="hasImage" class="image-badge" aria-hidden="true" title="Mit Bild">🖼</span>
      <span v-if="hasAudio" class="audio-badge" aria-hidden="true" title="Mit Audio">🔊</span>
    </template>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  points: number
  editMode?: boolean
  answered?: boolean
  answeredBy?: string | null
  hasImage?: boolean
  hasAudio?: boolean
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
button.is-answered:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-style: solid;
  background: var(--color-background-mute);
  color: var(--color-text);
}
button.is-answered:disabled:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
  border-color: var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-text);
}
.answered-badge {
  font-size: 0.85em;
  line-height: 1;
  color: var(--color-primary);
}
.edit-badge {
  font-size: 0.75em;
  line-height: 1;
}
.audio-badge .image-badge {
  font-size: 0.75em;
  line-height: 1;
}
</style>
