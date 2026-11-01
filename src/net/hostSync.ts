// Host side of the multiplayer sync: builds the content messages for viewers.

import type { CardPayload } from '@/net/protocol'
import { findQuestion } from '@/quiz/card'
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
