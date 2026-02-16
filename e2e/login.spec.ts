import { test, expect, takeScreenshot } from './fixtures';

test.describe('Login Page', () => {
    test('displays the login form', async ({ loginPage: page }) => {
        // Should have email and password input fields
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"], input[name="password"]');

        await expect(emailInput).toBeVisible({ timeout: 10_000 });
        await expect(passwordInput).toBeVisible();
    });

    test('has a submit/sign-in button', async ({ loginPage: page }) => {
        const submitButton = page.getByRole('button', { name: /log\s?in|sign\s?in|submit/i });
        await expect(submitButton).toBeVisible();
    });

    test('email input accepts text input', async ({ loginPage: page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');
    });

    test('password input masks characters', async ({ loginPage: page }) => {
        const passwordInput = page.locator('input[type="password"], input[name="password"]');
        await passwordInput.fill('testpassword123');
        // The type should remain password (masked)
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('shows sign-up option', async ({ loginPage: page }) => {
        // Look for sign-up link, tab, or toggle
        const signUpElement = page.getByText(/sign\s?up|create.*account|register/i).first();
        await expect(signUpElement).toBeVisible({ timeout: 5_000 });
    });

    test('visual regression: login page', async ({ loginPage: page }) => {
        await takeScreenshot(page, 'login-page');
    });
});
