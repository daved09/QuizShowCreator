// Helpers for addressing single cards (theme + point value) on the board.

import type { OpenCard, Question, Theme } from '@/types/quiz'

export const cardKey = (themeId: string, points: number): string => `${themeId}:${points}`

export const isSameCard = (card: OpenCard | null | undefined, other: OpenCard): boolean =>
  !!card && card.themeId === other.themeId && card.points === other.points

export const findTheme = (themes: Theme[], themeId: string): Theme | undefined =>
  themes.find((theme) => theme.id === themeId)

export const findQuestion = (
  themes: Theme[],
  themeId: string,
  points: number,
): Question | undefined =>
  findTheme(themes, themeId)?.questions.find((question) => question.points === points)
