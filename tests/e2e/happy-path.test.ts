import { test, expect, type Page } from '@playwright/test'

// Test credentials from .dev.vars
const TEST_USER = 'rex'
const TEST_PASS = 'adam'

// Helper: login and reach save slots screen
async function login(page: Page) {
  await page.goto('/')
  await expect(page.getByText('P.O.R.T.A.L')).toBeVisible()
  await page.locator('input[type="text"]').fill(TEST_USER)
  await page.locator('input[type="password"]').fill(TEST_PASS)
  await page.getByRole('button', { name: /request access/i }).click()
  // Wait for save slots screen
  await expect(page.getByText(/SELECT OPERATION FILE/i)).toBeVisible({ timeout: 10000 })
}

// Helper: ensure an empty slot exists, then click it to create a new game
async function createNewGame(page: Page) {
  // Wait for slot list to finish loading
  await expect(page.getByText('SLOT 1')).toBeVisible({ timeout: 10000 })

  // Accept any confirmation dialogs (delete confirmation)
  page.on('dialog', (d) => d.accept())

  // Use expect with timeout to wait for empty slot (handles animation delay)
  const emptySlot = page.getByText('// EMPTY SLOT').first()

  try {
    await expect(emptySlot).toBeVisible({ timeout: 2000 })
  } catch {
    // All slots occupied — force-click a DELETE button to free one
    // DELETE button is opacity-0 (revealed via hover on desktop / long-press on mobile)
    // In E2E tests we force-click since Playwright can't simulate long-press natively
    const lastSlot = page.locator('button.group').last()
    await lastSlot.locator('button').filter({ hasText: /DELETE/i }).click({ force: true })
    await expect(emptySlot).toBeVisible({ timeout: 5000 })
  }

  await emptySlot.click()
  // Should reach briefing screen
  await expect(page.getByText(/INCOMING DISPATCH/i)).toBeVisible({ timeout: 10000 })
}

// Tests modify shared save state, so they must run in order
test.describe.serial('Happy Path', () => {
  test('login screen renders correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('P.O.R.T.A.L')).toBeVisible()
    await expect(page.getByText('FIELD OPS')).toBeVisible()
    await expect(page.getByText(/OPERATIVE ID/i)).toBeVisible()
    await expect(page.getByText(/CLEARANCE CODE/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /request access/i })).toBeVisible()
    // Version number visible
    await expect(page.locator('text=/v\\d+\\.\\d+/')).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[type="text"]').fill('wrong')
    await page.locator('input[type="password"]').fill('bad')
    await page.getByRole('button', { name: /request access/i }).click()
    await expect(page.getByText(/access denied/i)).toBeVisible({ timeout: 10000 })
  })

  test('login with valid credentials reaches save slots', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/OPERATION FILES/i)).toBeVisible()
    // Should see slot 1, 2, 3 (either occupied or empty)
    await expect(page.getByText('SLOT 1')).toBeVisible()
  })

  test('create new game and reach briefing', async ({ page }) => {
    await login(page)
    await createNewGame(page)

    // Briefing screen elements
    await expect(page.getByText(/INCOMING DISPATCH/i)).toBeVisible()
    // Should see operative selection
    await expect(page.getByText(/DEPLOY FIELD TEAM/i)).toBeVisible()
  })

  test('deploy team and enter investigation', async ({ page }) => {
    await login(page)
    await createNewGame(page)

    // Select a mystery case file first
    await page.getByText('A Promise Is a Promise').click()
    await expect(page.getByText('SELECTED')).toBeVisible()

    // Select 2 operatives (click first two available)
    const operatives = page.locator('button').filter({ hasText: /The (Expert|Mundane|Crooked|Initiate|Snoop|Celebrity)/i })
    const count = await operatives.count()
    expect(count).toBeGreaterThanOrEqual(2)

    await operatives.nth(0).click()
    await operatives.nth(1).click()

    // Deploy button should be enabled now
    const deployBtn = page.getByRole('button', { name: /DEPLOY TEAM/i })
    await expect(deployBtn).toBeEnabled()
    await deployBtn.click()

    // Should enter investigation phase
    await expect(page.getByText(/INVESTIGATION PHASE/i)).toBeVisible({ timeout: 10000 })

    // Investigation UI elements should be present
    await expect(page.getByText(/INTEL:/)).toBeVisible()
    await expect(page.getByText(/CLOCK:/)).toBeVisible()
    await expect(page.getByText(/STAMINA:/)).toBeVisible()
  })

  test('logout returns to login screen', async ({ page }) => {
    await login(page)
    await page.getByText(/LOG OUT/i).click()
    await expect(page.getByText('P.O.R.T.A.L')).toBeVisible()
  })
})
