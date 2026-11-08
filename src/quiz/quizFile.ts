// The quiz JSON file format: building it for export and validating it on import.

import { MIN_CHOICES } from '@/constants'
import type { Question, Theme } from '@/types/quiz'
import { isFiniteNumber, isRecord } from '@/utils/guards'

export const QUIZ_FILE_VERSION = 1

export type QuizFile = {
  app: 'QuizShowCreator'
  version: number
  themes: Theme[]
}

export type ParseResult = { ok: true; themes: Theme[] } | { ok: false; error: string }

export const createQuizFile = (themes: Theme[]): QuizFile => ({
  app: 'QuizShowCreator',
  version: QUIZ_FILE_VERSION,
  themes,
})

// Validates untrusted file content. Themes get fresh IDs; questions
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
      const { points, question, answer, image, audio, buzzEnabled, choices } = rawQuestion
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
      const parsedQuestion: Question = {
        points,
        question,
        answer,
        image: parsedImage,
        audio: parsedAudio,
      }
      // Buzzing is optional (older files without the flag allow it).
      if (buzzEnabled === false) parsedQuestion.buzzEnabled = false
      // Choices are optional (older files only contain open questions).
      if (
        Array.isArray(choices) &&
        choices.length >= MIN_CHOICES &&
        choices.every((choice) => typeof choice === 'string')
      ) {
        parsedQuestion.choices = choices
      }
      questions.push(parsedQuestion)
    }
    questions.sort((a, b) => a.points - b.points)
    themes.push({ id: crypto.randomUUID(), themeText, questions })
  }

  // Players are not part of the file; older files containing them are still
  // readable, the players are ignored.
  return { ok: true, themes }
}
