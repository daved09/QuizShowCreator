import { expect, test, type Page } from '@playwright/test'
import { addPlayer, addTheme, card, editCard } from './helpers'

const setupBoard = async (page: Page): Promise<void> => {
  await page.goto('/')
  await addTheme(page, 'Geografie')
  await editCard(page, 0, 100, 'Hauptstadt von Frankreich?', 'Paris')
  await editCard(page, 0, 200, 'Hauptstadt von Italien?', 'Rom')
  await addPlayer(page, 'Anna')
  await addPlayer(page, 'Ben')
  await page.getByRole('switch').click()
  await expect(page.getByRole('switch')).toContainText('Bearbeiten')
}

const score = (page: Page, name: string) =>
  page.locator('.player-item', { hasText: name }).locator('.player-score')

test('im Spielmodus sind Bearbeitungs-Aktionen ausgeblendet', async ({ page }) => {
  await setupBoard(page)
  await expect(page.getByRole('button', { name: 'Spalte hinzufügen' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Exportieren' })).toBeHidden()
  await expect(page.getByPlaceholder('Neuer Spieler …')).toBeHidden()
  await expect(page.getByTitle('Thema löschen')).toBeHidden()
})

test('Antwort ist erst nach dem Aufdecken sichtbar', async ({ page }) => {
  await setupBoard(page)
  await card(page, 0, 100).click()
  await expect(page.getByText('Hauptstadt von Frankreich?')).toBeVisible()
  await expect(page.getByText('Paris')).toBeHidden()

  await page.getByRole('button', { name: 'Antwort anzeigen' }).click()
  await expect(page.getByText('Paris')).toBeVisible()

  await page.getByRole('button', { name: 'Antwort verbergen' }).click()
  await expect(page.getByText('Paris')).toBeHidden()
})

test('vergibt Punkte, markiert die Karte und sperrt erneute Vergabe', async ({ page }) => {
  await setupBoard(page)
  await card(page, 0, 100).click()
  await page.getByRole('button', { name: 'Antwort anzeigen' }).click()
  await page.getByRole('button', { name: /Anna\s*\+100/ }).click()

  await expect(score(page, 'Anna')).toHaveText('100')
  await expect(score(page, 'Ben')).toHaveText('0')
  await expect(card(page, 0, 100)).toHaveClass(/is-answered/)
  await expect(card(page, 0, 100)).toHaveAttribute('title', 'Beantwortet von Anna')

  // Reopening shows the answer and no award buttons.
  await card(page, 0, 100).click()
  await expect(page.getByText('Paris')).toBeVisible()
  await expect(page.getByText('✔ Bereits beantwortet von Anna')).toBeVisible()
  await expect(page.getByRole('button', { name: /\+100/ })).toHaveCount(0)
})

test('Punkte mehrerer Karten summieren sich', async ({ page }) => {
  await setupBoard(page)
  for (const [points, player] of [
    [100, 'Anna'],
    [200, 'Anna'],
  ] as const) {
    await card(page, 0, points).click()
    await page.getByRole('button', { name: 'Antwort anzeigen' }).click()
    await page.getByRole('button', { name: new RegExp(`${player}\\s*\\+${points}`) }).click()
  }
  await expect(score(page, 'Anna')).toHaveText('300')
})

test('Schließen ohne Vergabe lässt die Karte offen für später', async ({ page }) => {
  await setupBoard(page)
  await card(page, 0, 100).click()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await expect(card(page, 0, 100)).not.toHaveClass(/is-answered/)
})

test('Runde zurücksetzen setzt Punkte und Karten zurück', async ({ page }) => {
  await setupBoard(page)
  await card(page, 0, 100).click()
  await page.getByRole('button', { name: 'Antwort anzeigen' }).click()
  await page.getByRole('button', { name: /Ben\s*\+100/ }).click()
  await expect(score(page, 'Ben')).toHaveText('100')

  await page.getByRole('switch').click()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Runde zurücksetzen' }).click()
  await expect(score(page, 'Ben')).toHaveText('100')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Runde zurücksetzen' }).click()
  await expect(score(page, 'Ben')).toHaveText('0')
  await expect(card(page, 0, 100)).not.toHaveClass(/is-answered/)
})
