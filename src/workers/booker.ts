import { chromium, Browser } from 'playwright';
import { decrypt } from '@/lib/crypto';

interface Credential {
    encrypted_email: string;
    encrypted_password: string;
}

export class CloudTrucksBooker {

    async bookLoad(loadId: string, creds: Credential, dryRun = true) {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const scanner = new (await import('./scanner')).CloudTrucksScanner(); // Reuse login logic

        try {
            await scanner.login(page, creds);

            console.log(`Navigating to load ${loadId}...`);
            await page.goto(`https://app.cloudtrucks.com/loads/${loadId}`);

            // Wait for "Book Now" button
            const bookButtonSelector = 'button:has-text("Book Load")'; // Placeholder
            await page.waitForSelector(bookButtonSelector);

            if (dryRun) {
                console.log('Dry run: Stopping before click.');
                return { success: true, status: 'dry-run-completed' };
            }

            await page.click(bookButtonSelector);

            // Confirm modal
            const confirmSelector = 'button:has-text("Confirm Booking")';
            await page.click(confirmSelector);

            await page.waitForSelector('.success-message'); // Wait for confirmation
            console.log('Load booked successfully!');
            return { success: true, status: 'booked' };

        } catch (error) {
            console.error('Booking failed:', error);
            return { success: false, error };
        } finally {
            await browser.close();
        }
    }
}
