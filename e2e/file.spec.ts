import { expect, test } from '@playwright/test'
import { addTheme, editCard, exportedFiles, mockElectronApi, themeHeader } from './helpers'

const validQuiz = {
  version: 1,
  themes: [
    {
      id: 'theme-1',
      themeText: 'Importiert',
      questions: [
        { points: 100, question: 'Frage A', answer: 'Antwort A' },
        { points: 200, question: 'Frage B', answer: 'Antwort B' },
      ],
    },
  ],
}

test('exportiert das Quiz als JSON über die Electron-Bridge', async ({ page }) => {
  await mockElectronApi(page)
  await page.goto('/')
  await addTheme(page, 'Geografie')
  await editCard(page, 0, 100, 'Frage?', 'Antwort!')

  await page.getByRole('button', { name: 'Exportieren' }).click()
  await expect.poll(async () => (await exportedFiles(page)).length).toBe(1)

  const [json] = await exportedFiles(page)
  const data = JSON.parse(json)
  expect(JSON.stringify(data)).toContain('Geografie')
  expect(JSON.stringify(data)).toContain('Frage?')
  expect(JSON.stringify(data)).toContain('Antwort!')
})

test('importiert ein gültiges Quiz', async ({ page }) => {
  await mockElectronApi(page, validQuiz)
  await page.goto('/')
  await page.getByRole('button', { name: 'Importieren' }).click()
  await expect(themeHeader(page, 'Importiert')).toBeVisible()
})

test('fragt vor dem Ersetzen bestehender Themen nach', async ({ page }) => {
  await mockElectronApi(page, validQuiz)
  await page.goto('/')
  await addTheme(page, 'Alt')

  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Importieren' }).click()
  await expect(themeHeader(page, 'Alt')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Importieren' }).click()
  await expect(themeHeader(page, 'Importiert')).toBeVisible()
  await expect(themeHeader(page, 'Alt')).toHaveCount(0)
})

test('meldet ungültige Importdaten', async ({ page }) => {
  await mockElectronApi(page, { foo: 'bar' })
  await page.goto('/')
  const messages: string[] = []
  page.on('dialog', (dialog) => {
    messages.push(dialog.message())
    void dialog.accept()
  })
  await page.getByRole('button', { name: 'Importieren' }).click()
  await expect.poll(() => messages.length).toBe(1)
  expect(messages[0]).toContain('Import fehlgeschlagen')
  await expect(page.locator('.row-container > div')).toHaveCount(0)
})

test('abgebrochener Import ändert nichts', async ({ page }) => {
  await mockElectronApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Importieren' }).click()
  await expect(page.locator('.row-container > div')).toHaveCount(0)
})
