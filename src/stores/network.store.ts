// Multiplayer orchestration: role/connection state plus the wiring between the
// quiz store and the PeerJS transport.
//
// Host  -> watches the quiz store and broadcasts board snapshots plus the
//          content of the open card (and its answer once revealed).
// Client-> applies incoming snapshots / card content / answers to the quiz
//          store and is otherwise read-only. Its only input is the player name
//          sent with `hello`, which the host adds to the player list. Without a
//          name the host keeps entering players manually.

import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { MAX_PLAYER_NAME_LENGTH } from '@/constants'
import { normalizePlayerName } from '@/quiz/player'
import { useQuizStore } from '@/stores/quiz.store'
import { createHostSync, type HostSync } from '@/net/hostSync'
import { createSnapshot, parseMessage } from '@/net/protocol'
import {
  createClientTransport,
  createHostTransport,
  generateRoomCode,
  type ClientTransport,
  type HostTransport,
} from '@/net/transport'
import { createViewerSync } from '@/net/viewerSync'

export type NetworkRole = 'offline' | 'host' | 'client'
export type NetworkStatus = 'idle' | 'connecting' | 'connected' | 'error'

export const useNetworkStore = defineStore('network', () => {
  const quiz = useQuizStore()

  const role = ref<NetworkRole>('offline')
  const status = ref<NetworkStatus>('idle')
  const roomCode = ref<string | null>(null)
  const viewerCount = ref(0)
  const error = ref<string | null>(null)
  // Client: the name this viewer joined with (empty when none was given).
  const playerName = ref('')

  let hostTransport: HostTransport | null = null
  let clientTransport: ClientTransport | null = null
  let hostSync: HostSync | null = null
  let stopWatching: (() => void) | null = null
  // Invalidates handlers of a previous session (e.g. after leaving).
  let sessionId = 0
  // Host: connected viewer (peer id) -> the player it joined as.
  const peerPlayers = new Map<string, string>()

  const isHost = computed(() => role.value === 'host')
  const isClient = computed(() => role.value === 'client')
  const isOnline = computed(() => role.value !== 'offline')

  // Starts a new session and returns a wrapper that drops transport callbacks
  // once that session is over (left or replaced by a newer one).
  const startSession = () => {
    const session = ++sessionId
    return <A extends unknown[]>(handler: (...args: A) => void) =>
      (...args: A): void => {
        if (session === sessionId) handler(...args)
      }
  }

  const connectionClosed = (message: string): void => {
    status.value = 'idle'
    error.value = message
  }

  const connectionFailed = (message: string): void => {
    error.value = message
    status.value = 'error'
  }

  // Host -> all viewers: only what is visible right now (see createHostSync).
  const pushState = (): void => {
    if (!hostTransport || !hostSync || status.value !== 'connected') return
    for (const message of hostSync.messagesFor(quiz)) hostTransport.broadcast(message)
  }

  // Watches only what viewers can see: the content-free snapshot. Media and
  // question texts are not tracked, so editing them does not trigger a push.
  // Comparing the serialized snapshot skips pushes when nothing visible changed.
  const startWatching = (): void => {
    stopWatching?.()
    stopWatching = watch(
      () => JSON.stringify(createSnapshot(quiz)),
      () => pushState(),
    )
  }

  // Picks a name that is not yet used by another player, e.g. "Anna 2".
  const uniquePlayerName = (name: string): string => {
    const taken = new Set(quiz.players.map((player) => player.name.toLowerCase()))
    if (!taken.has(name.toLowerCase())) return name
    for (let i = 2; ; i++) {
      const suffix = ` ${i}`
      const candidate = name.slice(0, MAX_PLAYER_NAME_LENGTH - suffix.length) + suffix
      if (!taken.has(candidate.toLowerCase())) return candidate
    }
  }

  // Host: a viewer announced its name. An existing player with that name that
  // no other connected viewer has claimed is reused (host-entered players and
  // reconnects keep their score); otherwise a new player is added.
  const claimPlayer = (peerId: string, rawName: string | undefined): void => {
    const name = normalizePlayerName(rawName)
    if (!name || peerPlayers.has(peerId)) return
    const claimed = new Set(peerPlayers.values())
    const existing = quiz.players.find(
      (player) => player.name.toLowerCase() === name.toLowerCase() && !claimed.has(player.id),
    )
    const player = existing ?? quiz.addPlayer(uniquePlayerName(name))
    peerPlayers.set(peerId, player.id)
  }

  const startHosting = (): void => {
    if (isOnline.value) return
    leave()
    const guard = startSession()
    role.value = 'host'
    status.value = 'connecting'
    error.value = null
    const code = generateRoomCode()
    roomCode.value = code
    hostSync = createHostSync()
    hostTransport = createHostTransport(code, {
      onOpen: guard(() => {
        status.value = 'connected'
        startWatching()
      }),
      // Viewers are read-only apart from announcing their name.
      onData: guard((data: unknown, peerId: string) => {
        const message = parseMessage(data)
        if (message?.type === 'hello') claimPlayer(peerId, message.name)
      }),
      onViewerJoin: guard(() => {
        viewerCount.value += 1
        // A freshly joined viewer still needs the current card content.
        hostSync?.reset()
        pushState()
      }),
      onViewerLeave: guard((peerId: string) => {
        viewerCount.value = Math.max(0, viewerCount.value - 1)
        // The player stays in the list (with its score) so a reconnect with
        // the same name picks it up again.
        peerPlayers.delete(peerId)
      }),
      onClose: guard(() => connectionClosed('Verbindung zum Vermittlungsserver getrennt.')),
      onError: guard(connectionFailed),
    })
  }

  const join = (code: string, name?: string): void => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      connectionFailed('Bitte einen Raumcode eingeben.')
      return
    }
    if (isOnline.value) leave()
    const guard = startSession()
    status.value = 'connecting'
    error.value = null
    roomCode.value = trimmed
    playerName.value = normalizePlayerName(name)
    // Viewers never edit; switch to viewer mode right away so edit affordances
    // stay hidden while the connection is still being established.
    quiz.setEditMode(false)
    role.value = 'client'
    // Fresh per session, so no card content survives a reconnect.
    const viewerSync = createViewerSync(quiz)
    clientTransport = createClientTransport(trimmed, {
      onOpen: guard(() => {
        status.value = 'connected'
        clientTransport?.send(
          playerName.value ? { type: 'hello', name: playerName.value } : { type: 'hello' },
        )
      }),
      onData: guard((data: unknown) => {
        const message = parseMessage(data)
        if (!message) return
        if (message.type === 'state') viewerSync.applySnapshot(message.snapshot)
        else if (message.type === 'card') viewerSync.applyCard(message.card)
        else if (message.type === 'answer') viewerSync.applyAnswer(message.answer)
      }),
      onClose: guard(() => connectionClosed('Verbindung zum Host beendet.')),
      onError: guard(connectionFailed),
    })
  }

  const leave = (): void => {
    sessionId += 1
    stopWatching?.()
    stopWatching = null
    const host = hostTransport
    const client = clientTransport
    hostTransport = null
    clientTransport = null
    hostSync = null
    host?.close()
    client?.close()
    peerPlayers.clear()
    playerName.value = ''
    role.value = 'offline'
    status.value = 'idle'
    roomCode.value = null
    viewerCount.value = 0
    error.value = null
  }

  return {
    role,
    status,
    roomCode,
    viewerCount,
    error,
    playerName,
    isHost,
    isClient,
    isOnline,
    startHosting,
    join,
    leave,
  }
})
