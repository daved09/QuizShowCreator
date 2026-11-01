import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createSnapshot,
  type AnswerPayload,
  type CardPayload,
  type GameSnapshot,
} from '@/net/protocol'
import { DEFAULT_POINTS } from '@/constants'
import {
  cardKey,
  findQuestion as findQuestionIn,
  findTheme as findThemeIn,
  isSameCard,
} from '@/quiz/card'
import { normalizePlayerName } from '@/quiz/player'
import type { OpenCard, Player, Question, Theme } from '@/types/quiz'
import { isFiniteNumber, isRecord } from '@/utils/guards'

export const QUIZ_FILE_VERSION = 4

export type QuizFile = {
  app: 'QuizShowCreator'
  version: number
  themes: Theme[]
  players: Player[]
}

export type ImportResult = { ok: true } | { ok: false; error: string }

const createTheme = (themeText: string): Theme => {
  return {
    id: crypto.randomUUID(),
    themeText,
    questions: DEFAULT_POINTS.map((points) => ({ points, question: '', answer: '' })),
  }
}

export const useQuizStore = defineStore('quizshow', () => {
  const themes = ref<Theme[]>([])

  const players = ref<Player[]>([])

  // Runtime state: which card has already been answered (key -> player name).
  const answeredBy = ref<Map<string, string>>(new Map())

  // Runtime state: the question card currently opened (host driven; synced to viewers).
  const openCard = ref<OpenCard | null>(null)

  // Runtime state: whether the answer of the open card is revealed.
  const answerRevealed = ref<boolean>(false)

  // Client-side content of the currently open card. Question text, media and,
  // once revealed, the answer are kept here instead of the snapshot so viewers
  // only ever hold what they currently see.
  let openCardContent: (CardPayload & { key: string }) | null = null

  const isEditMode = ref<boolean>(true)

  const findTheme = (themeId: string): Theme | undefined => findThemeIn(themes.value, themeId)

  const findQuestion = (themeId: string, points: number): Question | undefined =>
    findQuestionIn(themes.value, themeId, points)

  const setEditMode = (value: boolean) => {
    isEditMode.value = value
  }

  const toggleEditMode = () => {
    isEditMode.value = !isEditMode.value
  }

  const addColumn = () => {
    themes.value.push(createTheme('New Theme'))
  }

  const removeTheme = (id: string) => {
    themes.value = themes.value.filter((t) => t.id !== id)
  }

  const updateThemeText = (id: string, themeText: string) => {
    const theme = findTheme(id)
    if (theme) {
      theme.themeText = themeText
    }
  }

  const updateQuestion = (themeId: string, points: number, question: string) => {
    const theme = findTheme(themeId)
    if (!theme) return
    const existing = theme.questions.find((q) => q.points === points)
    if (existing) {
      existing.question = question
    } else {
      theme.questions.push({ points, question, answer: '' })
    }
  }

  const updateQuestionFull = (themeId: string, oldPoints: number, data: Question): boolean => {
    const theme = findTheme(themeId)
    if (!theme) return false
    const target = theme.questions.find((q) => q.points === oldPoints)
    if (!target) return false
    if (!Number.isInteger(data.points)) return false
    if (data.points !== oldPoints && theme.questions.some((q) => q.points === data.points)) {
      return false
    }
    target.points = data.points
    target.question = data.question
    target.answer = data.answer
    target.image = data.image ? data.image : undefined
    target.audio = data.audio ? data.audio : undefined
    theme.questions.sort((a, b) => a.points - b.points)
    return true
  }

  const addPlayer = (name?: string): Player => {
    const player: Player = {
      id: crypto.randomUUID(),
      name: normalizePlayerName(name) || `Spieler ${players.value.length + 1}`,
      score: 0,
    }
    players.value.push(player)
    return player
  }

  const removePlayer = (id: string) => {
    players.value = players.value.filter((p) => p.id !== id)
  }

  const renamePlayer = (id: string, name: string) => {
    const player = players.value.find((p) => p.id === id)
    if (player) {
      player.name = normalizePlayerName(name) || player.name
    }
  }

  const awardPointsForCard = (playerId: string, themeId: string, cardPoints: number): boolean => {
    const player = players.value.find((p) => p.id === playerId)
    if (!player) return false
    player.score += cardPoints
    answeredBy.value.set(cardKey(themeId, cardPoints), player.name)
    return true
  }

  const isAnswered = (themeId: string, points: number): boolean => {
    return answeredBy.value.has(cardKey(themeId, points))
  }

  const getAnsweredBy = (themeId: string, points: number): string | null => {
    return answeredBy.value.get(cardKey(themeId, points)) ?? null
  }

  const openQuestion = (themeId: string, points: number) => {
    openCard.value = { themeId, points }
    // Already answered cards show the answer right away.
    answerRevealed.value = isAnswered(themeId, points)
  }

  const closeQuestion = () => {
    openCard.value = null
    answerRevealed.value = false
  }

  const setAnswerRevealed = (value: boolean) => {
    answerRevealed.value = value
  }

  const toggleAnswerRevealed = () => {
    answerRevealed.value = !answerRevealed.value
  }

  const resetRound = () => {
    players.value.forEach((p) => {
      p.score = 0
    })
    answeredBy.value = new Map()
    closeQuestion()
  }

  // --- Multiplayer snapshot handling -------------------------------------

  const toSnapshot = (): GameSnapshot => {
    return createSnapshot({
      themes: themes.value,
      players: players.value,
      answeredBy: answeredBy.value,
      openCard: openCard.value,
      answerRevealed: answerRevealed.value,
    })
  }

  // Host: the content of a card, used to ship it when the card is opened.
  // The answer is only included when it is already revealed.
  const getQuestionCard = (themeId: string, points: number): CardPayload | null => {
    const question = findQuestion(themeId, points)
    if (!question) return null
    const card: CardPayload = {
      themeId,
      points,
      question: question.question,
    }
    if (question.image) card.image = question.image
    if (question.audio) card.audio = question.audio
    if (answerRevealed.value) card.answer = question.answer
    return card
  }

  // Host: the answer of a card, shipped separately once it is revealed.
  const getQuestionAnswer = (themeId: string, points: number): string | null => {
    return findQuestion(themeId, points)?.answer ?? null
  }

  // Applies a board snapshot received from the host (viewers only). The snapshot
  // carries no question content, so only the currently open card is filled in
  // from the cached `card` payload.
  const applySnapshot = (snapshot: GameSnapshot) => {
    const open = snapshot.openCard
    const openKey = open ? cardKey(open.themeId, open.points) : null
    const content = openKey && openCardContent?.key === openKey ? openCardContent : null
    // A closed card (or a different one) drops the cached content.
    if (!content) openCardContent = null

    themes.value = snapshot.themes.map((theme) => ({
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
    }))
    players.value = snapshot.players.map((player) => ({ ...player }))
    answeredBy.value = new Map(snapshot.answeredBy)
    openCard.value = open ? { ...open } : null
    answerRevealed.value = snapshot.answerRevealed
  }

  // Applies the content of a card shipped by the host when it is opened.
  const applyCard = (card: CardPayload) => {
    openCardContent = { ...card, key: cardKey(card.themeId, card.points) }
    if (!isSameCard(openCard.value, card)) return
    const question = findQuestion(card.themeId, card.points)
    if (!question) return
    question.question = card.question
    question.image = card.image
    question.audio = card.audio
    if (answerRevealed.value && card.answer !== undefined) {
      question.answer = card.answer
    }
  }

  // Applies a reveal (or hide, with `answer: null`) for the open card.
  const applyAnswer = (payload: AnswerPayload) => {
    if (!isSameCard(openCard.value, payload)) return
    const key = cardKey(payload.themeId, payload.points)
    const question = findQuestion(payload.themeId, payload.points)
    if (payload.answer === null) {
      if (question) question.answer = ''
      if (openCardContent?.key === key) {
        openCardContent = { ...openCardContent, answer: undefined }
      }
    } else {
      if (question) question.answer = payload.answer
      if (openCardContent?.key === key) {
        openCardContent = { ...openCardContent, answer: payload.answer }
      }
    }
  }

  const exportQuiz = (): QuizFile => {
    return {
      app: 'QuizShowCreator',
      version: QUIZ_FILE_VERSION,
      themes: themes.value,
      players: players.value,
    }
  }

  const importQuiz = (data: unknown): ImportResult => {
    if (!isRecord(data)) {
      return { ok: false, error: 'Ungültiges Dateiformat.' }
    }
    const rawThemes = data.themes
    if (!Array.isArray(rawThemes)) {
      return { ok: false, error: 'Keine Themen in der Datei gefunden.' }
    }
    const parsed: Theme[] = []
    for (const rawTheme of rawThemes) {
      if (!isRecord(rawTheme)) {
        return { ok: false, error: 'Ungültiges Thema in der Datei.' }
      }
      const themeText = rawTheme.themeText
      if (typeof themeText !== 'string') {
        return { ok: false, error: 'Ein Thema hat keinen gültigen Namen.' }
      }
      const rawQuestions = rawTheme.questions
      if (!Array.isArray(rawQuestions)) {
        return { ok: false, error: 'Ein Thema enthält keine gültigen Fragen.' }
      }
      const questions: Question[] = []
      for (const rawQuestion of rawQuestions) {
        if (!isRecord(rawQuestion)) {
          return { ok: false, error: 'Ungültige Frage in der Datei.' }
        }
        const { points, question, answer, image, audio } = rawQuestion
        if (!isFiniteNumber(points)) {
          return { ok: false, error: 'Eine Frage hat eine ungültige Punktzahl.' }
        }
        if (typeof question !== 'string' || typeof answer !== 'string') {
          return { ok: false, error: 'Eine Frage hat ungültigen Text.' }
        }
        // Image is optional (older files without an image stay readable).
        const parsedImage =
          typeof image === 'string' && image.startsWith('data:image/') ? image : undefined
        // Audio is optional (older files without audio stay readable).
        const parsedAudio =
          typeof audio === 'string' && audio.startsWith('data:audio/') ? audio : undefined
        questions.push({ points, question, answer, image: parsedImage, audio: parsedAudio })
      }
      questions.sort((a, b) => a.points - b.points)
      parsed.push({ id: crypto.randomUUID(), themeText, questions })
    }

    // Players are optional (older files without players stay readable).
    const rawPlayers = data.players
    const parsedPlayers: Player[] = []
    if (rawPlayers !== undefined) {
      if (!Array.isArray(rawPlayers)) {
        return { ok: false, error: 'Ungültige Spielerliste in der Datei.' }
      }
      for (const rawPlayer of rawPlayers) {
        if (!isRecord(rawPlayer)) {
          return { ok: false, error: 'Ein Spieler in der Datei ist ungültig.' }
        }
        const { name, score } = rawPlayer
        if (typeof name !== 'string') {
          return { ok: false, error: 'Ein Spieler hat keinen gültigen Namen.' }
        }
        const playerScore = isFiniteNumber(score) ? score : 0
        parsedPlayers.push({ id: crypto.randomUUID(), name, score: playerScore })
      }
    }

    themes.value = parsed
    players.value = parsedPlayers
    answeredBy.value = new Map()
    closeQuestion()
    return { ok: true }
  }

  return {
    addColumn,
    removeTheme,
    updateThemeText,
    updateQuestion,
    updateQuestionFull,
    addPlayer,
    removePlayer,
    renamePlayer,
    awardPointsForCard,
    isAnswered,
    getAnsweredBy,
    openQuestion,
    closeQuestion,
    setAnswerRevealed,
    toggleAnswerRevealed,
    toSnapshot,
    applySnapshot,
    applyCard,
    applyAnswer,
    getQuestionCard,
    getQuestionAnswer,
    resetRound,
    exportQuiz,
    importQuiz,
    themes,
    players,
    answeredBy,
    isEditMode,
    setEditMode,
    toggleEditMode,
    openCard,
    answerRevealed,
  }
})
