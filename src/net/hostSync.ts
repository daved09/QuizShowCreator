// Host side of the multiplayer sync: builds the content messages for viewers.

import { createSnapshot, type CardPayload, type HostMessage } from '@/net/protocol'
import { cardKey, findQuestion } from '@/quiz/card'
import type { BoardState } from '@/stores/quiz.store'
import type { OpenCard, Theme } from '@/types/quiz'

// The content of a card, shipped when it is opened. The answer is only
// included when it is already revealed.
export const createCardPayload = (
  themes: Theme[],
  card: OpenCard,
  answerRevealed: boolean,
): CardPayload | null => {
  const question = findQuestion(themes, card.themeId, card.points)
  if (!question) return null
  const payload: CardPayload = {
    themeId: card.themeId,
    points: card.points,
    question: question.question,
  }
  if (question.image) payload.image = question.image
  if (question.audio) payload.audio = question.audio
  if (answerRevealed) payload.answer = question.answer
  return payload
}

// The answer of a card, shipped separately once it is revealed.
export const getCardAnswer = (themes: Theme[], card: OpenCard): string | null =>
  findQuestion(themes, card.themeId, card.points)?.answer ?? null

export type HostSync = {
  // The messages to broadcast for the current board, in order.
  messagesFor: (board: BoardState) => HostMessage[]
  // Forgets what was sent, so the open card (and answer) is shipped again,
  // e.g. for a freshly joined viewer.
  reset: () => void
}

// Tracks what the viewers already know and only ships what is visible right
// now: the open card's content once per open, its answer once revealed (or
// `null` once hidden again), and always the content-free board snapshot last.
export const createHostSync = (): HostSync => {
  // The card whose content was sent last, so it is only shipped once per open.
  let lastCardKey: string | null = null
  // Whether the answer of the currently tracked card is known by the viewers.
  let answerSent = false

  const reset = (): void => {
    lastCardKey = null
    answerSent = false
  }

  const messagesFor = (board: BoardState): HostMessage[] => {
    const messages: HostMessage[] = []
    const card = board.openCard
    if (!card) {
      reset()
    } else {
      const key = cardKey(card.themeId, card.points)
      if (key !== lastCardKey) {
        const payload = createCardPayload(board.themes, card, board.answerRevealed)
        if (payload) messages.push({ type: 'card', card: payload })
        lastCardKey = key
        // An already answered card ships the answer together with the card.
        answerSent = board.answerRevealed
      }
      if (board.answerRevealed && !answerSent) {
        const answer = getCardAnswer(board.themes, card)
        if (answer !== null) {
          messages.push({ type: 'answer', answer: { ...card, answer } })
        }
        answerSent = true
      } else if (!board.answerRevealed && answerSent) {
        messages.push({ type: 'answer', answer: { ...card, answer: null } })
        answerSent = false
      }
    }
    messages.push({ type: 'state', snapshot: createSnapshot(board) })
    return messages
  }

  return { messagesFor, reset }
}
