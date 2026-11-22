<template>
  <button
    data-ripple
    :class="{ 'edit-mode': editMode, 'is-answered': answered }"
    :title="answered && answeredBy ? `Beantwortet von ${answeredBy}` : undefined"
    @click="onClick"
  >
    <span>{{ points }}</span>
    <span v-if="answered" class="answered-badge" aria-hidden="true"><AppIcon name="check" /></span>
    <span v-else-if="editMode" class="edit-badge" aria-hidden="true"><AppIcon name="edit" /></span>
    <template v-if="editMode">
      <span v-if="hasImage" class="image-badge" aria-hidden="true" title="Mit Bild"
        ><AppIcon name="image"
      /></span>
      <span v-if="hasAudio" class="audio-badge" aria-hidden="true" title="Mit Audio"
        ><AppIcon name="volume_up"
      /></span>
    </template>
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
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

const onClick = (): void => {
  emit('pointButtonClicked', props.points)
}
</script>

<style scoped>
/* Filled tonal button */
button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 6rem;
  height: 3.5rem;
  margin: 0.5rem;
  font: inherit;
  /* title-large */
  font-size: 22px;
  font-weight: 500;
  color: var(--md-sys-color-on-secondary-container);
  background: var(--md-sys-color-secondary-container);
  border: none;
  border-radius: var(--md-sys-shape-lg);
  cursor: pointer;
  overflow: hidden;
  transition:
    box-shadow var(--transition-fast),
    border-radius var(--transition-fast),
    transform var(--transition-fast),
    background-color var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing);
}
button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
}
button:hover:not(:disabled) {
  box-shadow: var(--md-sys-elevation-1);
}
button:hover:not(:disabled)::before {
  opacity: var(--md-state-hover);
}
button:active:not(:disabled) {
  border-radius: var(--md-sys-shape-md);
  transform: scale(0.96);
}
button:active:not(:disabled)::before,
button:focus-visible::before {
  opacity: var(--md-state-pressed);
}
button:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}
button.edit-mode {
  color: var(--md-sys-color-on-primary-container);
  background: var(--md-sys-color-primary-container);
}
button.is-answered:disabled {
  cursor: not-allowed;
  color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
}
.answered-badge {
  animation: md-pop var(--md-sys-motion-duration-long) var(--md-sys-motion-easing) both;
  font-size: 0.7em;
  line-height: 1;
}
.edit-badge {
  font-size: 0.6em;
  line-height: 1;
}
.image-badge,
.audio-badge {
  font-size: 0.6em;
  line-height: 1;
}
</style>
