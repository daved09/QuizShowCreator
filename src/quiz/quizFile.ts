// The quiz JSON file format: building it for export and validating it on import.

import type { Player, Question, Theme } from '@/types/quiz'
import { isFiniteNumber, isRecord } from '@/utils/guards'

export const QUIZ_FILE_VERSION = 4

export type QuizFile = {
  app: 'QuizShowCreator'
  version: number
  themes: Theme[]
  players: Player[]
}

export type ParseResult =
  { ok: true; themes: Theme[]; players: Player[] } | { ok: false; error: string }

export const createQuizFile = (themes: Theme[], players: Player[]): QuizFile => ({
  app: 'QuizShowCreator',
  version: QUIZ_FILE_VERSION,
  themes,
  players,
})

// Validates untrusted file content. Themes and players get fresh IDs; questions
// are sorted by points. Returns a German error message for the first problem found.
export const parseQuizFile = (data: unknown): ParseResult => {
  if (!isRecord(data)) {
    return { ok: false, error: 'Ungültiges Dateiformat.' }
  }
  const rawThemes = data.themes
  if (!Array.isArray(rawThemes)) {
    return { ok: false, error: 'Keine Themen in der Datei gefunden.' }
  }
  const themes: Theme[] = []
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
    themes.push({ id: crypto.randomUUID(), themeText, questions })
  }

  // Players are optional (older files without players stay readable).
  const rawPlayers = data.players
  const players: Player[] = []
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
      players.push({ id: crypto.randomUUID(), name, score: isFiniteNumber(score) ? score : 0 })
    }
  }

  return { ok: true, themes, players }
}
