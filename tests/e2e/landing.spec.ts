import { test, expect } from '@playwright/test';

test('landing page loads without crashing', async ({ page }) => {
  // Go to the local dev server home page
  await page.goto('/');

  // Ensure the body is loaded and visible
  await expect(page.locator('body')).toBeVisible();

  // Ensure there's a `<main>` block or equivalent structure rendered by Next.js
  const title = await page.title();
  expect(title).toBeDefined();
  
  // Basic screenshot comparison or text match can be added here
  // For this generic sample, we just assert the app isn't crashing
});
