import { expect, type Page } from '@playwright/test'

// Replaces the Electron bridge: exports are collected, imports return `importData`.
export const mockElectronApi = async (page: Page, importData?: unknown): Promise<void> => {
  await page.addInitScript((data) => {
    const w = window as unknown as Record<string, unknown>
    w.__exports = [] as string[]
    w.electronAPI = {
      platform: 'linux',
      exportQuiz: async (json: string) => {
        ;(w.__exports as string[]).push(json)
        return { success: true, canceled: false, path: '/tmp/quiz.json' }
      },
      importQuiz: async () =>
        data === undefined
          ? { success: false, canceled: true }
          : { success: true, canceled: false, data: JSON.stringify(data) },
    }
  }, importData)
}

export const exportedFiles = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __exports: string[] }).__exports)

export const themeHeader = (page: Page, text: string) =>
  page.getByRole('heading', { level: 3, name: text })

export const card = (page: Page, column: number, points: number) =>
  page
    .locator('.row-container > div')
    .nth(column)
    .getByRole('button', { name: String(points) })

export const addTheme = async (page: Page, name: string): Promise<number> => {
  await page.getByRole('button', { name: 'Spalte hinzufügen' }).click()
  const count = await page.locator('.row-container > div').count()
  const index = count - 1
  await page.locator('.row-container > div').nth(index).locator('.theme-header').click()
  await page.locator('.theme-header-input').fill(name)
  await page.locator('.theme-header-input').press('Enter')
  await expect(themeHeader(page, name)).toBeVisible()
  return index
}

export const addPlayer = async (page: Page, name: string): Promise<void> => {
  await page.getByPlaceholder('Neuer Spieler …').fill(name)
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await expect(page.locator('.player-name', { hasText: name })).toBeVisible()
}

// Fills the question and answer of a card in edit mode and saves.
export const editCard = async (
  page: Page,
  column: number,
  points: number,
  question: string,
  answer: string,
): Promise<void> => {
  await card(page, column, points).click()
  await page.getByPlaceholder('Frage formulieren …').fill(question)
  await page.getByPlaceholder('Antwort …').fill(answer)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByPlaceholder('Frage formulieren …')).toBeHidden()
}
