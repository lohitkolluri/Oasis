import { test, expect } from '@playwright/test';

test.describe('API Endpoint Health Checks', () => {
  test('the standard /api/health endpoint connects and returns 200 OK', async ({ request }) => {
    // Ping the backend API directly using the Playwright API context
    const response = await request.get('/api/health');
    
    // Assert 200 OK status
    expect(response.status()).toBe(200);
    expect(response.ok()).toBeTruthy();

    // Verify a JSON payload propagates
    const data = await response.json();
    expect(data).toBeDefined();
    // Usually health endpoints return status: "ok" or similar
    // We expect basic structure safely
  });
});
