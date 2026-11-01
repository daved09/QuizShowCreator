import { expect, test } from '@playwright/test'

test('öffnet und schließt den Lobby-Dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Online spielen/ }).click()
  await expect(page.getByRole('heading', { name: 'Online spielen' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spiel hosten' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Beitreten' })).toBeDisabled()

  await page.getByLabel('Raumcode').fill('ABC123')
  await expect(page.getByRole('button', { name: 'Beitreten' })).toBeEnabled()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Online spielen' })).toBeHidden()
})
