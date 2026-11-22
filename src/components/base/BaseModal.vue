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
        <button class="modal-close" title="Schließen" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>
      <slot />
    </div>
    <!-- Content stacked above the dialog, e.g. a fullscreen image. -->
    <slot name="overlay" />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
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
  background: color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
  animation: md-fade-in var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing) both;
}
.modal-dialog {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-xl);
  max-height: 90vh;
  overflow: auto;
  box-shadow: var(--md-sys-elevation-3);
  animation: md-scale-in var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized)
    both;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 24px 24px 16px;
}
.modal-header h2 {
  margin: 0;
  /* headline-small */
  font-size: 24px;
  line-height: 32px;
  font-weight: 400;
  color: var(--md-sys-color-on-surface);
}
.modal-close {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--md-sys-shape-full);
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--md-sys-color-on-surface-variant);
  transition: background-color var(--transition-fast);
}
.modal-close:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 8%, transparent);
}
.modal-close:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
}
</style>
