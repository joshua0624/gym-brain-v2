import { test, expect } from '@playwright/test';
import { setupAPIMocks, TEST_USER } from './helpers.js';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  test('login redirects to workout page on success', async ({ page }) => {
    await page.goto('/login');

    // Verify we're on the login page
    await expect(page.locator('h1')).toContainText('GymBrAIn');

    // Fill in credentials
    await page.fill('#usernameOrEmail', 'e2etester');
    await page.fill('#password', 'TestPassword1!');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to /workout
    await page.waitForURL('**/workout');
    await expect(page).toHaveURL(/\/workout/);
  });

  test('login shows error for failed credentials', async ({ page }) => {
    // Override login mock to return 401
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    await page.fill('#usernameOrEmail', 'wronguser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on login page (not redirect)
    await expect(page).toHaveURL(/\/login/);
  });

  test('register creates account and redirects', async ({ page }) => {
    await page.goto('/register');

    await page.fill('#username', 'newuser');
    await page.fill('#email', 'new@test.com');
    await page.fill('#password', 'TestPassword1!');
    await page.fill('#confirmPassword', 'TestPassword1!');

    await page.click('button[type="submit"]');

    // Should redirect to /workout after registration
    await page.waitForURL('**/workout');
    await expect(page).toHaveURL(/\/workout/);
  });

  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Don't set any tokens - try to access protected route
    await page.goto('/history');

    // Should redirect to login
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');

    const signUpLink = page.locator('a[href="/register"]');
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    await expect(page).toHaveURL(/\/register/);
  });
});
