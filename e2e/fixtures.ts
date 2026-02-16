import { test as base, expect, Page } from '@playwright/test';

/**
 * Custom E2E test fixtures for Cloud-Trucks.
 * Provides reusable page helpers and authentication utilities.
 */

// Extended test with helpers
export const test = base.extend<{
    /** Navigate to the landing page */
    landingPage: Page;
    /** Navigate to the login page */
    loginPage: Page;
    /** Navigate to the dashboard (unauthenticated — will redirect to login) */
    dashboardPage: Page;
}>({
    landingPage: async ({ page }, use) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await use(page);
    },
    loginPage: async ({ page }, use) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await use(page);
    },
    dashboardPage: async ({ page }, use) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await use(page);
    },
});

export { expect };

/**
 * Wait for a specific text to appear on the page.
 */
export async function waitForText(page: Page, text: string, timeout = 10_000) {
    await page.waitForSelector(`text="${text}"`, { timeout });
}

/**
 * Take a named screenshot for visual regression.
 */
export async function takeScreenshot(page: Page, name: string) {
    await page.screenshot({
        path: `e2e/screenshots/${name}.png`,
        fullPage: true,
    });
}
