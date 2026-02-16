import { test, expect, takeScreenshot } from './fixtures';

test.describe('Dashboard Access (Unauthenticated)', () => {
    test('redirects to login when not authenticated', async ({ dashboardPage: page }) => {
        // When accessing /dashboard without auth, we should be redirected to login
        // or shown an auth prompt
        const url = page.url();
        const hasLogin = url.includes('/login');
        const hasAuthPrompt = await page.getByText(/log\s?in|sign\s?in|unauthorized/i)
            .first()
            .isVisible()
            .catch(() => false);

        expect(hasLogin || hasAuthPrompt).toBeTruthy();
    });

    test('visual regression: dashboard redirect state', async ({ dashboardPage: page }) => {
        await takeScreenshot(page, 'dashboard-unauthenticated');
    });
});

test.describe('Navigation', () => {
    test('landing page → login navigation works', async ({ landingPage: page }) => {
        // Click the Log In link specifically
        const loginLink = page.getByRole('link', { name: /log\s?in/i }).first();

        if (await loginLink.isVisible()) {
            await loginLink.click();
            // Wait for client-side navigation to complete
            await page.waitForURL('**/login', { timeout: 10_000 });
            expect(page.url()).toContain('/login');
        }
    });
});
