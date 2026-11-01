import { expect, test } from '@playwright/test'
import { addPlayer, addTheme, card, editCard, themeHeader } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('startet im Bearbeitungsmodus ohne Themen und Spieler', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Quizshow Creator' })).toBeVisible()
  await expect(page.getByRole('switch')).toContainText('Spielen')
  await expect(page.locator('.row-container > div')).toHaveCount(0)
  await expect(page.getByText('Noch keine Spieler.')).toBeVisible()
})

test('fügt eine Spalte mit fünf Karten hinzu', async ({ page }) => {
  await page.getByRole('button', { name: 'Spalte hinzufügen' }).click()
  await expect(themeHeader(page, 'New Theme')).toBeVisible()
  const column = page.locator('.row-container > div').first()
  for (const points of [100, 200, 300, 400, 500]) {
    await expect(column.getByRole('button', { name: String(points) })).toBeVisible()
  }
})

test('benennt ein Thema um und begrenzt die Länge', async ({ page }) => {
  const index = await addTheme(page, 'Geografie')
  await page.locator('.row-container > div').nth(index).locator('.theme-header').click()
  const input = page.locator('.theme-header-input')
  await input.fill('x'.repeat(30))
  await expect(input).toHaveValue('x'.repeat(15))
})

test('Esc verwirft die Änderung des Themennamens', async ({ page }) => {
  await addTheme(page, 'Sport')
  await page.locator('.theme-header').click()
  await page.locator('.theme-header-input').fill('Anders')
  await page.locator('.theme-header-input').press('Escape')
  await expect(themeHeader(page, 'Sport')).toBeVisible()
})

test('löscht ein Thema nach Bestätigung', async ({ page }) => {
  await addTheme(page, 'Sport')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByTitle('Thema löschen').click()
  await expect(themeHeader(page, 'Sport')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByTitle('Thema löschen').click()
  await expect(themeHeader(page, 'Sport')).toHaveCount(0)
})

test('bearbeitet eine Karte und zeigt die Medien-Hinweise', async ({ page }) => {
  await addTheme(page, 'Geografie')
  await editCard(page, 0, 100, 'Hauptstadt von Frankreich?', 'Paris')

  await card(page, 0, 100).click()
  await expect(page.getByPlaceholder('Frage formulieren …')).toHaveValue(
    'Hauptstadt von Frankreich?',
  )
  await expect(page.getByPlaceholder('Antwort …')).toHaveValue('Paris')
})

test('Abbrechen verwirft die Kartenänderung', async ({ page }) => {
  await addTheme(page, 'Geografie')
  await card(page, 0, 100).click()
  await page.getByPlaceholder('Frage formulieren …').fill('Verworfen')
  await page.getByRole('button', { name: 'Abbrechen' }).click()

  await card(page, 0, 100).click()
  await expect(page.getByPlaceholder('Frage formulieren …')).toHaveValue('')
})

test('Esc schließt den Karten-Dialog', async ({ page }) => {
  await addTheme(page, 'Geografie')
  await card(page, 0, 200).click()
  await expect(page.getByPlaceholder('Frage formulieren …')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByPlaceholder('Frage formulieren …')).toBeHidden()
})

test('verwaltet Spieler: hinzufügen, umbenennen, entfernen', async ({ page }) => {
  await addPlayer(page, 'Anna')
  await addPlayer(page, 'Ben')
  await expect(page.locator('.player-item')).toHaveCount(2)

  await page.locator('.player-name', { hasText: 'Anna' }).click()
  const input = page.locator('.player-item .name-input')
  await input.fill('Annabelle-Lang-Name')
  await expect(input).toHaveValue('Annabelle-')
  await input.press('Enter')
  await expect(page.locator('.player-name', { hasText: 'Annabelle-' })).toBeVisible()

  await page.locator('.player-item', { hasText: 'Ben' }).getByTitle('Spieler entfernen').click()
  await expect(page.locator('.player-item')).toHaveCount(1)
})

test('ein Spieler ohne Namen bekommt einen Standardnamen', async ({ page }) => {
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await expect(page.locator('.player-name')).toHaveText('Spieler 1')
})
