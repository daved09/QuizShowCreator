<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div
      class="modal-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      :style="{ width: `min(${width}, 100%)` }"
    >
      <header class="modal-header">
        <h2>{{ title }}</h2>
        <button class="modal-close" title="Schließen" @click="emit('close')">✖</button>
      </header>
      <slot />
    </div>
    <!-- Content stacked above the dialog, e.g. a fullscreen image. -->
    <slot name="overlay" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// Dialog frame: backdrop, title bar with close button and Escape handling.
// Every way of closing emits `close`; the parent decides what that means.
withDefaults(defineProps<{ title: string; width?: string }>(), { width: '32rem' })

const emit = defineEmits<{ (e: 'close'): void }>()

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal-dialog {
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}
.modal-header h2 {
  font-size: 1.1rem;
  margin: 0;
}
.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}
.modal-close:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.modal-close:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
