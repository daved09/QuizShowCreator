// Viewer side of the multiplayer sync: applies host messages to the quiz store.
//
// The board snapshot carries no question content. The content of the open card
// (and its answer once revealed) arrives as separate `card` / `answer` messages
// and is cached here, so later snapshots can fill it in again. Viewers thereby
// only ever hold what they currently see.

import type { AnswerPayload, CardPayload, GameSnapshot } from '@/net/protocol'
import { cardKey, isSameCard } from '@/quiz/card'
import type { useQuizStore } from '@/stores/quiz.store'
import type { Question } from '@/types/quiz'

type QuizStore = ReturnType<typeof useQuizStore>

export type ViewerSync = {
  applySnapshot: (snapshot: GameSnapshot) => void
  applyCard: (card: CardPayload) => void
  applyAnswer: (payload: AnswerPayload) => void
}

export const createViewerSync = (quiz: QuizStore): ViewerSync => {
  // Content of the currently open card, as last shipped by the host.
  let openCardContent: (CardPayload & { key: string }) | null = null

  const applySnapshot = (snapshot: GameSnapshot): void => {
    const open = snapshot.openCard
    const openKey = open ? cardKey(open.themeId, open.points) : null
    const content = openKey && openCardContent?.key === openKey ? openCardContent : null
    // A closed card (or a different one) drops the cached content.
    if (!content) openCardContent = null

    quiz.loadBoard({
      themes: snapshot.themes.map((theme) => ({
        id: theme.id,
        themeText: theme.themeText,
        questions: theme.questions.map((question) => {
          const mapped: Question = { points: question.points, question: '', answer: '' }
          if (content && openKey === cardKey(theme.id, question.points)) {
            mapped.question = content.question
            mapped.image = content.image
            mapped.audio = content.audio
            if (snapshot.answerRevealed && content.answer !== undefined) {
              mapped.answer = content.answer
            }
          }
          return mapped
        }),
      })),
      players: snapshot.players.map((player) => ({ ...player })),
      answeredBy: new Map(snapshot.answeredBy),
      openCard: open ? { ...open } : null,
      answerRevealed: snapshot.answerRevealed,
    })
  }

  // Applies the content of a card shipped by the host when it is opened.
  const applyCard = (card: CardPayload): void => {
    openCardContent = { ...card, key: cardKey(card.themeId, card.points) }
    if (!isSameCard(quiz.openCard, card)) return
    quiz.patchQuestion(card.themeId, card.points, {
      question: card.question,
      image: card.image,
      audio: card.audio,
      ...(quiz.answerRevealed && card.answer !== undefined ? { answer: card.answer } : {}),
    })
  }

  // Applies a reveal (or hide, with `answer: null`) for the open card.
  const applyAnswer = (payload: AnswerPayload): void => {
    if (!isSameCard(quiz.openCard, payload)) return
    quiz.patchQuestion(payload.themeId, payload.points, { answer: payload.answer ?? '' })
    if (openCardContent?.key === cardKey(payload.themeId, payload.points)) {
      openCardContent = { ...openCardContent, answer: payload.answer ?? undefined }
    }
  }

  return { applySnapshot, applyCard, applyAnswer }
}
