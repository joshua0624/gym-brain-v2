import { test, expect } from '@playwright/test';
import { setupAPIMocks, loginAndNavigate, TEST_EXERCISES } from './helpers.js';

test.describe('Workout Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  test('start blank workout shows empty exercise list', async ({ page }) => {
    await loginAndNavigate(page);

    // Start modal should be visible
    await expect(page.locator('text=Start Blank Workout')).toBeVisible();

    // Click start blank
    await page.click('text=Start Blank Workout');

    // Workout should be started - no exercises yet
    await expect(page.locator('text=No exercises added yet')).toBeVisible();

    // Add Exercise button should be visible
    await expect(page.locator('text=Add Exercise')).toBeVisible();
  });

  test('full workout flow: add exercise, log set, complete', async ({ page }) => {
    await loginAndNavigate(page);

    // Start blank workout
    await page.click('text=Start Blank Workout');

    // Click "Add Exercise" button
    await page.click('text=Add Exercise');

    // Exercise selection modal should appear
    await expect(page.locator('text=Barbell Bench Press')).toBeVisible();

    // Select Barbell Bench Press
    await page.click('text=Barbell Bench Press');

    // Exercise should be added to workout
    await expect(page.locator('h3:has-text("Barbell Bench Press")')).toBeVisible();

    // Click "Add Set"
    await page.click('text=Add Set');

    // Set entry form should appear with Set 1
    await expect(page.locator('h4:has-text("Set 1")')).toBeVisible();

    // Set is auto-populated with previous performance values (225 lbs, 5 reps, 2 RIR)
    // Fill in using spinbutton role (input type=number)
    const spinbuttons = page.getByRole('spinbutton');
    await spinbuttons.nth(0).fill('225');
    await spinbuttons.nth(1).fill('5');

    // Save set
    await page.click('button:has-text("Save Set")');

    // Click Complete button
    await page.click('button:has-text("Complete")');

    // Confirmation dialog may appear - accept it
    const completeConfirm = page.locator('button:has-text("Complete Workout")');
    if (await completeConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await completeConfirm.click();
    }

    // Should navigate to history after completion
    await page.waitForURL('**/history', { timeout: 10000 });
    await expect(page).toHaveURL(/\/history/);
  });

  test('exercise search filters the list', async ({ page }) => {
    await loginAndNavigate(page);
    await page.click('text=Start Blank Workout');
    await page.click('text=Add Exercise');

    // Search for "squat"
    await page.fill('input[placeholder="Search exercises..."]', 'squat');

    // Should show Barbell Squat
    await expect(page.locator('text=Barbell Squat')).toBeVisible();

    // Should NOT show Bench Press
    await expect(page.locator('button:has-text("Barbell Bench Press")')).not.toBeVisible();
  });

  test('can add multiple exercises to a workout', async ({ page }) => {
    await loginAndNavigate(page);
    await page.click('text=Start Blank Workout');

    // Add first exercise
    await page.click('text=Add Exercise');
    await page.click('text=Barbell Bench Press');
    await expect(page.locator('h3:has-text("Barbell Bench Press")')).toBeVisible();

    // Add second exercise
    await page.click('button:has-text("Add Exercise")');
    await page.click('text=Barbell Squat');
    await expect(page.locator('h3:has-text("Barbell Squat")')).toBeVisible();

    // Both should be visible
    await expect(page.locator('h3:has-text("Barbell Bench Press")')).toBeVisible();
    await expect(page.locator('h3:has-text("Barbell Squat")')).toBeVisible();
  });
});
