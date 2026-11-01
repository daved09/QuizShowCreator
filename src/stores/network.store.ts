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
import { useQuizStore } from '@/stores/quiz.store'
import { parseMessage } from '@/net/protocol'
import {
  createClientTransport,
  createHostTransport,
  generateRoomCode,
  type Transport,
} from '@/net/transport'

export type NetworkRole = 'offline' | 'host' | 'client'
export type NetworkStatus = 'idle' | 'connecting' | 'connected' | 'error'

// Matches the max length of the player name inputs in the player panel.
export const MAX_PLAYER_NAME_LENGTH = 10

export const normalizePlayerName = (name: string | undefined): string =>
  (name ?? '').trim().slice(0, MAX_PLAYER_NAME_LENGTH)

export const useNetworkStore = defineStore('network', () => {
  const quiz = useQuizStore()

  const role = ref<NetworkRole>('offline')
  const status = ref<NetworkStatus>('idle')
  const roomCode = ref<string | null>(null)
  const viewerCount = ref(0)
  const error = ref<string | null>(null)
  // Client: the name this viewer joined with (empty when none was given).
  const playerName = ref('')

  let transport: Transport | null = null
  let stopWatching: (() => void) | null = null
  // The card whose content was sent last, so it is only shipped once per open.
  let lastCardKey: string | null = null
  // Whether the answer of the currently tracked card is known by the viewers.
  let answerSent = false
  // Invalidates handlers of a previous session (e.g. after leaving).
  let sessionId = 0
  // Host: connected viewer (peer id) -> the player it joined as.
  const peerPlayers = new Map<string, string>()

  const isHost = computed(() => role.value === 'host')
  const isClient = computed(() => role.value === 'client')
  const isOnline = computed(() => role.value !== 'offline')

  // Host -> all viewers: only what is visible right now. The board snapshot
  // carries no content; the open card's question/media and its answer (once
  // revealed) are shipped as separate messages, and the snapshot follows last.
  const pushState = (): void => {
    if (!transport || role.value !== 'host' || status.value !== 'connected') return
    const card = quiz.openCard
    if (card) {
      const key = `${card.themeId}:${card.points}`
      if (key !== lastCardKey) {
        const payload = quiz.getQuestionCard(card.themeId, card.points)
        if (payload) transport.broadcast({ type: 'card', card: payload })
        lastCardKey = key
        // An already answered card ships the answer together with the card.
        answerSent = quiz.answerRevealed
      }
      if (quiz.answerRevealed && !answerSent) {
        const answer = quiz.getQuestionAnswer(card.themeId, card.points)
        if (answer !== null) {
          transport.broadcast({
            type: 'answer',
            answer: { themeId: card.themeId, points: card.points, answer },
          })
        }
        answerSent = true
      } else if (!quiz.answerRevealed && answerSent) {
        transport.broadcast({
          type: 'answer',
          answer: { themeId: card.themeId, points: card.points, answer: null },
        })
        answerSent = false
      }
    } else {
      lastCardKey = null
      answerSent = false
    }
    transport.broadcast({ type: 'state', snapshot: quiz.toSnapshot() })
  }

  const startWatching = (): void => {
    stopWatching?.()
    const stop = watch(
      () => [quiz.themes, quiz.players, quiz.answeredBy, quiz.openCard, quiz.answerRevealed],
      () => pushState(),
      { deep: true },
    )
    stopWatching = () => stop()
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
    const session = ++sessionId
    role.value = 'host'
    status.value = 'connecting'
    error.value = null
    const code = generateRoomCode()
    roomCode.value = code
    transport = createHostTransport(code, {
      onOpen: () => {
        if (session !== sessionId) return
        status.value = 'connected'
        startWatching()
      },
      // Viewers are read-only apart from announcing their name.
      onData: (data, peerId) => {
        if (session !== sessionId) return
        const message = parseMessage(data)
        if (message?.type === 'hello') claimPlayer(peerId, message.name)
      },
      onViewerJoin: () => {
        if (session !== sessionId) return
        viewerCount.value += 1
        // A freshly joined viewer still needs the current card content.
        lastCardKey = null
        answerSent = false
        pushState()
      },
      onViewerLeave: (peerId) => {
        if (session !== sessionId) return
        viewerCount.value = Math.max(0, viewerCount.value - 1)
        // The player stays in the list (with its score) so a reconnect with
        // the same name picks it up again.
        peerPlayers.delete(peerId)
      },
      onClose: () => {
        if (session !== sessionId) return
        status.value = 'idle'
        error.value = 'Verbindung zum Vermittlungsserver getrennt.'
      },
      onError: (message) => {
        if (session !== sessionId) return
        error.value = message
        status.value = 'error'
      },
    })
  }

  const join = (code: string, name?: string): void => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      error.value = 'Bitte einen Raumcode eingeben.'
      status.value = 'error'
      return
    }
    if (isOnline.value) leave()
    const session = ++sessionId
    status.value = 'connecting'
    error.value = null
    roomCode.value = trimmed
    playerName.value = normalizePlayerName(name)
    // Viewers never edit; switch to viewer mode right away so edit affordances
    // stay hidden while the connection is still being established.
    quiz.setEditMode(false)
    role.value = 'client'
    transport = createClientTransport(trimmed, {
      onOpen: () => {
        if (session !== sessionId) return
        status.value = 'connected'
        role.value = 'client'
        transport?.send(
          playerName.value ? { type: 'hello', name: playerName.value } : { type: 'hello' },
        )
      },
      onData: (data) => {
        if (session !== sessionId) return
        const message = parseMessage(data)
        if (!message) return
        if (message.type === 'state') quiz.applySnapshot(message.snapshot)
        else if (message.type === 'card') quiz.applyCard(message.card)
        else if (message.type === 'answer') quiz.applyAnswer(message.answer)
      },
      onClose: () => {
        if (session !== sessionId) return
        status.value = 'idle'
        error.value = 'Verbindung zum Host beendet.'
      },
      onError: (message) => {
        if (session !== sessionId) return
        error.value = message
        status.value = 'error'
      },
    })
  }

  const leave = (): void => {
    sessionId += 1
    stopWatching?.()
    stopWatching = null
    const active = transport
    transport = null
    active?.close()
    lastCardKey = null
    answerSent = false
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
