<template>
  <div class="connection-status">
    <template v-if="networkStore.isHost">
      <span class="status-badge is-online">
        <span class="status-dot" aria-hidden="true"></span>
        Host · {{ networkStore.roomCode }}
      </span>
      <span class="viewer-count">{{ networkStore.viewerCount }} Zuschauer</span>
      <button class="connection-button btn" type="button" @click="networkStore.leave()">
        Beenden
      </button>
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
      <button class="connection-button btn" type="button" @click="networkStore.leave()">
        Verlassen
      </button>
    </template>

    <button
      v-else
      class="connection-button btn btn-primary"
      type="button"
      @click="emit('openLobby')"
    >
      <AppIcon name="public" />Online spielen
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { useNetworkStore } from '@/stores/network.store'

const emit = defineEmits<{ (e: 'openLobby'): void }>()

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
  flex-wrap: wrap;
  gap: 0.5rem;
}
/* Assist-chip style badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 32px;
  padding: 0 12px;
  font-weight: 500;
  letter-spacing: 0.1px;
  color: var(--md-sys-color-on-surface-variant);
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-sm);
  white-space: nowrap;
}
.status-badge.is-online {
  border-color: transparent;
  color: var(--md-sys-color-on-primary-container);
  background: var(--md-sys-color-primary-container);
}
.status-badge.is-error {
  border-color: transparent;
  color: var(--md-sys-color-on-error-container);
  background: var(--md-sys-color-error-container);
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.viewer-count {
  font-size: 12px;
  letter-spacing: 0.4px;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
}
</style>
