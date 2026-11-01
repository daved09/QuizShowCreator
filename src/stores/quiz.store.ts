import { ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_POINTS } from '@/constants'
import { cardKey, findQuestion as findQuestionIn, findTheme as findThemeIn } from '@/quiz/card'
import { normalizePlayerName } from '@/quiz/player'
import { createQuizFile, parseQuizFile, type QuizFile } from '@/quiz/quizFile'
import type { OpenCard, Player, Question, Theme } from '@/types/quiz'

export type ImportResult = { ok: true } | { ok: false; error: string }

// The complete board state, as replaced by a snapshot from the host.
export type BoardState = {
  themes: Theme[]
  players: Player[]
  answeredBy: Map<string, string>
  openCard: OpenCard | null
  answerRevealed: boolean
}

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

  // --- Multiplayer (viewer side) ----------------------------------------

  // Replaces the whole board state, e.g. with a snapshot received from the host.
  const loadBoard = (state: BoardState) => {
    themes.value = state.themes
    players.value = state.players
    answeredBy.value = state.answeredBy
    openCard.value = state.openCard
    answerRevealed.value = state.answerRevealed
  }

  // Overwrites the content fields of a single card without touching its points.
  const patchQuestion = (
    themeId: string,
    points: number,
    patch: Partial<Omit<Question, 'points'>>,
  ) => {
    const question = findQuestion(themeId, points)
    if (question) Object.assign(question, patch)
  }

  const exportQuiz = (): QuizFile => createQuizFile(themes.value, players.value)

  const importQuiz = (data: unknown): ImportResult => {
    const result = parseQuizFile(data)
    if (!result.ok) return result
    themes.value = result.themes
    players.value = result.players
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
    resetRound,
    loadBoard,
    patchQuestion,
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
