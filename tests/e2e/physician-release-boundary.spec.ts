import { expect, test } from '@playwright/test'

test('stage demo keeps Publisher blocked until explicit physician approval', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /From new research to an auditable clinical decision/i }),
  ).toBeVisible()

  const autonomousReleaseMetric = page
    .getByText('Autonomous releases', { exact: true })
    .locator('..')

  await expect(autonomousReleaseMetric).toContainText('0')
  await page.getByRole('button', { name: 'Use stage demo' }).click()

  const approveButton = page.getByRole('button', {
    name: 'Approve as Patrick Tran, MD',
  })
  const publisherStage = page.locator('#publisher-stage')

  await expect(approveButton).toBeEnabled({ timeout: 20_000 })
  await expect(publisherStage).toContainText('Awaiting physician')
  await expect(page.getByRole('heading', { name: 'Every claim has a receipt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Autonomy stops here' })).toBeVisible()

  await approveButton.click()

  await expect(page.getByText('Publisher is unlocked.', { exact: true })).toBeVisible()
  await expect(publisherStage).toContainText('Complete')
  await expect(autonomousReleaseMetric).toContainText('0')
  await expect(page.getByText('Evidence card approved. Publisher unlocked.')).toBeVisible()
})
