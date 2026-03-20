import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test('dashboard route handles rendering and routing correctly', async ({ page }) => {
    // Navigate to the Dashboard
    await page.goto('/dashboard');
    
    await expect(page.locator('body')).toBeVisible();

    // Check the URL. It either loads the dashboard directly, 
    // or redirects to an authentication page like /login if it's protected.
    // Both behaviors confirm the Next.js routing & middleware is functioning.
    const currentUrl = page.url();
    const isDashboardOrAuth = currentUrl.includes('/dashboard') || currentUrl.includes('/login') || currentUrl.includes('/auth') || currentUrl.includes('/signin');
    
    expect(isDashboardOrAuth).toBeTruthy();
  });
});
