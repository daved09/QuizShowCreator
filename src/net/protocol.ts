// Wire protocol for the peer-to-peer multiplayer mode.
//
// The host is authoritative: it turns its quiz state into a snapshot and
// broadcasts it. Viewers (clients) only ever receive state; the only message
// they send back are a lightweight `hello` and the `buzz` of the buzzer.
//
// The board snapshot is deliberately kept content-free: it only carries what a
// viewer actually sees on the board (themes, point values, players, scores and
// markers). Question text and media are shipped separately as a `card` message
// when a card is opened, and the answer only follows as an `answer` message once
// it is revealed. That way a viewer never receives content before it is shown.

import type { OpenCard, Player, Theme } from '@/types/quiz'
import { isFiniteNumber, isRecord } from '@/utils/guards'

export const PROTOCOL_VERSION = 3

export type SnapshotQuestion = {
  points: number
}

export type SnapshotTheme = {
  id: string
  themeText: string
  questions: SnapshotQuestion[]
}

export type SnapshotPlayer = {
  id: string
  name: string
  score: number
}

export type GameSnapshot = {
  v: number
  themes: SnapshotTheme[]
  players: SnapshotPlayer[]
  // Map entries as plain [key, value] pairs so JSON/BinaryPack transport works.
  answeredBy: Array<[string, string]>
  openCard: OpenCard | null
  answerRevealed: boolean
  // Id of the player who hit the buzzer first for the open card.
  buzzedBy: string | null
}

// Content of a single question card, shipped only while that card is open.
export type CardPayload = {
  themeId: string
  points: number
  question: string
  image?: string
  audio?: string
  // Only set when buzzing is disabled for the card.
  buzzEnabled?: false
  // Only set when the answer is already visible when the card is opened.
  answer?: string
}

// Reveal (or hide, with `answer: null`) the answer of the open card.
export type AnswerPayload = {
  themeId: string
  points: number
  answer: string | null
}

// Host -> viewer
export type HostMessage =
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'card'; card: CardPayload }
  | { type: 'answer'; answer: AnswerPayload }

// Viewer -> host
export type ClientMessage = { type: 'hello'; name?: string } | { type: 'buzz' }

export type NetMessage = HostMessage | ClientMessage

// Builds a content-free snapshot from the raw store data.
export const createSnapshot = (input: {
  themes: Theme[]
  players: Player[]
  answeredBy: Map<string, string>
  openCard: OpenCard | null
  answerRevealed: boolean
  buzzedBy: string | null
}): GameSnapshot => ({
  v: PROTOCOL_VERSION,
  themes: input.themes.map((theme) => ({
    id: theme.id,
    themeText: theme.themeText,
    questions: theme.questions.map((question) => ({
      points: question.points,
    })),
  })),
  players: input.players.map((player) => ({
    id: player.id,
    name: player.name,
    score: player.score,
  })),
  answeredBy: Array.from(input.answeredBy.entries()),
  openCard: input.openCard ? { ...input.openCard } : null,
  answerRevealed: input.answerRevealed,
  buzzedBy: input.buzzedBy,
})

const isOpenCard = (value: unknown): value is OpenCard =>
  isRecord(value) && typeof value.themeId === 'string' && isFiniteNumber(value.points)

const isSnapshotQuestion = (value: unknown): value is SnapshotQuestion =>
  isRecord(value) && isFiniteNumber(value.points)

const isSnapshotTheme = (value: unknown): value is SnapshotTheme =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.themeText === 'string' &&
  Array.isArray(value.questions) &&
  value.questions.every(isSnapshotQuestion)

const isSnapshotPlayer = (value: unknown): value is SnapshotPlayer =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isFiniteNumber(value.score)

const isAnsweredEntry = (value: unknown): value is [string, string] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string'

export const isGameSnapshot = (value: unknown): value is GameSnapshot =>
  isRecord(value) &&
  typeof value.v === 'number' &&
  Array.isArray(value.themes) &&
  value.themes.every(isSnapshotTheme) &&
  Array.isArray(value.players) &&
  value.players.every(isSnapshotPlayer) &&
  Array.isArray(value.answeredBy) &&
  value.answeredBy.every(isAnsweredEntry) &&
  (value.openCard === null || isOpenCard(value.openCard)) &&
  typeof value.answerRevealed === 'boolean' &&
  (value.buzzedBy === null || typeof value.buzzedBy === 'string')

const isCardPayload = (value: unknown): value is CardPayload =>
  isRecord(value) &&
  typeof value.themeId === 'string' &&
  isFiniteNumber(value.points) &&
  typeof value.question === 'string' &&
  (value.image === undefined || typeof value.image === 'string') &&
  (value.audio === undefined || typeof value.audio === 'string') &&
  (value.buzzEnabled === undefined || value.buzzEnabled === false) &&
  (value.answer === undefined || typeof value.answer === 'string')

const isAnswerPayload = (value: unknown): value is AnswerPayload =>
  isRecord(value) &&
  typeof value.themeId === 'string' &&
  isFiniteNumber(value.points) &&
  (value.answer === null || typeof value.answer === 'string')

// Parses and validates an incoming message. Returns null for anything that is
// not a known, well-formed message so callers can simply ignore it.
export const parseMessage = (raw: unknown): NetMessage | null => {
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!isRecord(data)) return null
  const type = data.type
  if (type === 'hello') {
    return { type: 'hello', name: typeof data.name === 'string' ? data.name : undefined }
  }
  if (type === 'buzz') return { type: 'buzz' }
  if (type === 'state') {
    return isGameSnapshot(data.snapshot) ? { type: 'state', snapshot: data.snapshot } : null
  }
  if (type === 'card') {
    return isCardPayload(data.card) ? { type: 'card', card: data.card } : null
  }
  if (type === 'answer') {
    return isAnswerPayload(data.answer) ? { type: 'answer', answer: data.answer } : null
  }
  return null
}
