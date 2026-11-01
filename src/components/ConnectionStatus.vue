<template>
  <div class="connection-status">
    <template v-if="networkStore.isHost">
      <span class="status-badge is-online">
        <span class="status-dot" aria-hidden="true"></span>
        Host · {{ networkStore.roomCode }}
      </span>
      <span class="viewer-count">{{ networkStore.viewerCount }} Zuschauer</span>
      <button class="connection-button" type="button" @click="networkStore.leave()">Beenden</button>
    </template>

    <template v-else-if="networkStore.isClient">
      <span
        class="status-badge"
        :class="{
          'is-online': networkStore.status === 'connected',
          'is-error': networkStore.status === 'error',
        }"
      >
        <span class="status-dot" aria-hidden="true"></span>
        {{ clientLabel }}
      </span>
      <button class="connection-button" type="button" @click="networkStore.leave()">
        Verlassen
      </button>
    </template>

    <button v-else class="connection-button is-primary" type="button" @click="emit('open-lobby')">
      Online spielen
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNetworkStore } from '@/stores/network.store'

const emit = defineEmits<{ (e: 'open-lobby'): void }>()

const networkStore = useNetworkStore()

const clientLabel = computed(() => {
  switch (networkStore.status) {
    case 'connecting':
      return 'Verbinde …'
    case 'connected':
      return `Verbunden · ${networkStore.roomCode}`
    case 'error':
      return networkStore.error ?? 'Verbindungsfehler'
    default:
      return 'Getrennt'
  }
})
</script>

<style scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  white-space: nowrap;
}
.status-badge.is-online {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.status-badge.is-error {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.status-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: currentColor;
}
.viewer-count {
  font-size: 0.85rem;
  opacity: 0.75;
  white-space: nowrap;
}
.connection-button {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.9rem;
  font: inherit;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}
.connection-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.connection-button.is-primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: transparent;
}
.connection-button.is-primary:hover {
  color: var(--color-on-primary);
  background: var(--color-primary-hover);
}
.connection-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
