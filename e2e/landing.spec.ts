import { test, expect, takeScreenshot } from './fixtures';

test.describe('Landing Page', () => {
    test('loads and displays main heading', async ({ landingPage: page }) => {
        // The landing page should contain the brand name or main CTA
        const heading = page.locator('h1').first();
        await expect(heading).toBeVisible({ timeout: 10_000 });
    });

    test('has correct page title', async ({ landingPage: page }) => {
        await expect(page).toHaveTitle(/Cloud.*Trucks|CloudTrucks/i);
    });

    test('displays navigation elements', async ({ landingPage: page }) => {
        // Should have some navigation — links, buttons, etc.
        const navLinks = page.locator('nav a, header a, nav button, header button');
        const count = await navLinks.count();
        expect(count).toBeGreaterThan(0);
    });

    test('has login or sign-in link/button', async ({ landingPage: page }) => {
        const loginElement = page.getByRole('link', { name: /log\s?in|sign\s?in|get\s?started/i })
            .or(page.getByRole('button', { name: /log\s?in|sign\s?in|get\s?started/i }));
        await expect(loginElement.first()).toBeVisible({ timeout: 5_000 });
    });

    test('visual regression: landing page', async ({ landingPage: page }) => {
        await takeScreenshot(page, 'landing-page');
    });
});
