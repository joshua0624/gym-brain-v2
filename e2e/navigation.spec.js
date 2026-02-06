import { test, expect } from '@playwright/test';
import { setupAPIMocks, loginAndNavigate, setAuthTokens, TEST_USER, TEST_WORKOUTS } from './helpers.js';

test.describe('Navigation & Page Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  test('history page shows completed workouts', async ({ page }) => {
    await loginAndNavigate(page);

    // Close the start modal first
    await page.click('text=Start Blank Workout');

    // Navigate to history via bottom nav
    await page.click('a[href="/history"]');
    await page.waitForURL('**/history');

    // Should show the mock workout in the table
    await expect(page.getByRole('cell', { name: 'Push Day' })).toBeVisible();
  });

  test('profile page shows user info and install button', async ({ page }) => {
    await loginAndNavigate(page);
    await page.click('text=Start Blank Workout');

    // Navigate to profile
    await page.click('a[href="/profile"]');
    await page.waitForURL('**/profile');

    // Should show username
    await expect(page.locator(`text=${TEST_USER.username}`)).toBeVisible();

    // Should show Install App section
    await expect(page.locator('text=Install App')).toBeVisible();

    // Click "How to Install" button
    await page.click('text=How to Install');

    // Modal should appear with instructions
    await expect(page.locator('text=Install GymBrAIn')).toBeVisible();
    await expect(page.locator('text=iPhone / iPad (Safari)')).toBeVisible();
    await expect(page.locator('text=Android (Chrome)')).toBeVisible();
    await expect(page.locator('text=Desktop (Chrome / Edge)')).toBeVisible();

    // Close modal
    await page.click('button[aria-label="Close modal"]');
    await expect(page.locator('text=iPhone / iPad (Safari)')).not.toBeVisible();
  });

  test('bottom navigation works between all pages', async ({ page }) => {
    await loginAndNavigate(page);
    await page.click('text=Start Blank Workout');

    // Navigate through all pages
    await page.click('a[href="/history"]');
    await expect(page).toHaveURL(/\/history/);

    await page.click('a[href="/progress"]');
    await expect(page).toHaveURL(/\/progress/);

    await page.click('a[href="/library"]');
    await expect(page).toHaveURL(/\/library/);

    await page.click('a[href="/profile"]');
    await expect(page).toHaveURL(/\/profile/);

    await page.click('a[href="/workout"]');
    await expect(page).toHaveURL(/\/workout/);
  });
});
