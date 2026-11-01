<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Online spielen">
      <header class="modal-header">
        <h2>Online spielen</h2>
        <button class="modal-close" @click="emit('close')" title="Schließen">✖</button>
      </header>

      <div class="modal-body">
        <p v-if="networkStore.error" class="error">{{ networkStore.error }}</p>

        <section class="lobby-section">
          <h3>Spiel hosten</h3>
          <template v-if="networkStore.isHost">
            <p class="hint">Teile diesen Raumcode mit deinen Mitspielern:</p>
            <div class="code-row">
              <code class="room-code">{{ networkStore.roomCode }}</code>
              <button type="button" class="secondary" @click="copyCode">Kopieren</button>
            </div>
            <p class="hint">{{ hostStatusText }}</p>
            <button type="button" class="danger" @click="networkStore.leave()">
              Hosting beenden
            </button>
          </template>
          <template v-else>
            <p class="hint">Starte eine Sitzung und teile den Raumcode mit den Mitspielern.</p>
            <button type="button" class="primary" @click="networkStore.startHosting()">
              Spiel hosten
            </button>
          </template>
        </section>

        <hr class="divider" />

        <section class="lobby-section">
          <h3>Beitreten</h3>
          <template v-if="networkStore.isClient">
            <p class="hint">{{ clientStatusText }}</p>
            <button type="button" class="danger" @click="networkStore.leave()">
              Verbindung trennen
            </button>
          </template>
          <form v-else class="join-form" @submit.prevent="join">
            <input
              v-model="name"
              class="name-input"
              :maxlength="MAX_PLAYER_NAME_LENGTH"
              placeholder="Dein Name"
              aria-label="Dein Name"
            />
            <div class="join-row">
              <input
                v-model="code"
                class="code-input"
                maxlength="8"
                placeholder="Raumcode"
                aria-label="Raumcode"
              />
              <button type="submit" class="primary" :disabled="!code.trim()">Beitreten</button>
            </div>
            <p class="hint">
              Mit Namen erscheinst du automatisch in der Spielerliste. Ohne Namen trägt dich der Host ein.
            </p>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { MAX_PLAYER_NAME_LENGTH, useNetworkStore } from '@/stores/network.store'

const emit = defineEmits<{ (e: 'close'): void }>()

// Remembers the last used name so it does not have to be typed again.
const NAME_STORAGE_KEY = 'quizshow.playerName'

const readStoredName = (): string => {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

const storeName = (value: string): void => {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, value)
  } catch {
    // Storage is optional; ignore failures.
  }
}

const networkStore = useNetworkStore()
const code = ref('')
const name = ref(readStoredName())

const join = (): void => {
  if (!code.value.trim()) return
  storeName(name.value.trim())
  networkStore.join(code.value, name.value)
}

const copyCode = async (): Promise<void> => {
  if (!networkStore.roomCode) return
  try {
    await navigator.clipboard?.writeText(networkStore.roomCode)
  } catch {
    // Clipboard access is optional; ignore failures.
  }
}

const hostStatusText = computed(() => {
  switch (networkStore.status) {
    case 'connecting':
      return 'Sitzung wird gestartet …'
    case 'error':
      return networkStore.error ?? 'Fehler beim Starten.'
    default:
      return `${networkStore.viewerCount} Mitspieler verbunden.`
  }
})

const clientStatusText = computed(() => {
  switch (networkStore.status) {
    case 'connecting':
      return 'Verbindung wird aufgebaut …'
    case 'connected':
      return networkStore.playerName
        ? `Verbunden mit Raum ${networkStore.roomCode} als ${networkStore.playerName}.`
        : `Verbunden mit Raum ${networkStore.roomCode}.`
    case 'error':
      return networkStore.error ?? 'Verbindung fehlgeschlagen.'
    default:
      return 'Verbindung getrennt.'
  }
})
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
  width: min(28rem, 100%);
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
}
.modal-close:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
}
.lobby-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.lobby-section h3 {
  margin: 0;
  font-size: 1rem;
}
.hint {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}
.code-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.room-code {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  color: var(--color-primary);
  background: var(--color-background-soft);
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
}
.join-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.join-row {
  display: flex;
  gap: 0.5rem;
}
.name-input,
.code-input {
  flex: 1;
  min-width: 0;
  font: inherit;
  padding: 0.5rem;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.code-input {
  text-transform: uppercase;
}
.name-input:focus,
.code-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-soft);
}
.divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0;
}
.error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
}
button {
  font: inherit;
  font-weight: 600;
  padding: 0.5rem 1rem;
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
button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.primary {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: transparent;
}
button.primary:hover {
  color: var(--color-on-primary);
  background: var(--color-primary-hover);
}
button.danger {
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border-color: transparent;
}
button.danger:hover {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
</style>
