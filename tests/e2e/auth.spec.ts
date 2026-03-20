import { test, expect } from '@playwright/test';

test.describe('Authentication Routing', () => {
  test('login route avoids 500 error regressions', async ({ page }) => {
    // Attempt navigation
    const response = await page.goto('/login');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Since some apps might use different folder structures or handle logins differently
    // we just want to ensure it's not throwing a fatal 500 server error natively.
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('register route avoids 500 error regressions', async ({ page }) => {
    // Attempt navigation
    const response = await page.goto('/register');
    
    await expect(page.locator('body')).toBeVisible();
    
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });
});
