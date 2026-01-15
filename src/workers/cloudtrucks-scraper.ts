import { chromium, Browser, Page } from 'playwright';
import { decryptCredentials } from '@/lib/crypto';

interface SearchCriteria {
    id: string;
    origin_city: string | null;
    dest_city: string | null;
    min_rate: number | null;
    equipment_type: string | null;
}

interface CloudTrucksLoad {
    id: string;
    origin: string;
    destination: string;
    rate: number;
    distance: number;
    weight: number;
    equipment: string;
    pickup_date: string;
    broker: string;
    rate_per_mile: number;
}

/**
 * Login to CloudTrucks
 */
async function login(page: Page, email: string, password: string): Promise<boolean> {
    try {
        console.log('Navigating to CloudTrucks login...');
        await page.goto('https://app.cloudtrucks.com/login', { waitUntil: 'networkidle' });

        // Fill login form
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);

        // Click login button
        await page.click('button[type="submit"]');

        // Wait for navigation to dashboard
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('Login successful');
        return true;

    } catch (error) {
        console.error('Login failed:', error);
        return false;
    }
}

/**
 * Search for loads based on criteria
 */
async function searchLoads(
    page: Page,
    criteria: SearchCriteria
): Promise<CloudTrucksLoad[]> {
    try {
        // Navigate to search page
        await page.goto('https://app.cloudtrucks.com/search/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Enter pickup location if specified
        if (criteria.origin_city) {
            const pickupInput = page.locator('input[placeholder="Enter Location"]').first();
            await pickupInput.click();
            await pickupInput.fill(criteria.origin_city);
            await page.waitForTimeout(1000);

            // Select from autocomplete
            const suggestion = page.locator('.multistop-path-item-location').first();
            if (await suggestion.isVisible({ timeout: 3000 })) {
                await suggestion.click();
            }
        }

        // Enter dropoff location if specified
        if (criteria.dest_city) {
            const dropoffInput = page.locator('input[placeholder="Enter Location"]').nth(1);
            await dropoffInput.click();
            await dropoffInput.fill(criteria.dest_city);
            await page.waitForTimeout(1000);

            // Select from autocomplete
            const suggestion = page.locator('.mult istop-path-item-location').first();
            if (await suggestion.isVisible({ timeout: 3000 })) {
                await suggestion.click();
            }
        }

        // Click search button
        const searchButton = page.locator('button.SearchFilterToolbarV3__StyledIconButton-cfpwpA');
        await searchButton.click();

        // Wait for results to load
        await page.waitForSelector('div[data-testid="load-item"]', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Extract load data
        const loads = await page.evaluate(() => {
            const loadCards = Array.from(document.querySelectorAll('div[data-testid="load-item"]'));

            return loadCards.map((card) => {
                // Extract cities (first is origin, second is destination)
                const cities = Array.from(card.querySelectorAll('.multistop-path-item-location'));
                const origin = cities[0]?.textContent?.trim() || '';
                const destination = cities[1]?.textContent?.trim() || '';

                // Extract rate
                const rateEl = card.querySelector('.listed-price');
                const rateText = rateEl?.textContent?.trim() || '$0';
                const rate = parseFloat(rateText.replace(/[$,]/g, ''));

                // Extract rate per mile
                const rpmEl = card.querySelector('.rate-per-mile');
                const rpmText = rpmEl?.textContent?.trim() || '$0';
                const rate_per_mile = parseFloat(rpmText.replace(/[$,/mi]/g, ''));

                // Extract equipment details (format: "Dry van | 1304 mi | 40000 lbs")
                const equipmentEl = card.querySelector('.load-list-equipment');
                const equipmentText = equipmentEl?.textContent?.trim() || '';
                const parts = equipmentText.split('|').map(p => p.trim());

                const equipment = parts[0] || 'Unknown';
                const distance = parseFloat(parts[1]?.replace(/[^\d.]/g, '') || '0');
                const weight = parseFloat(parts[2]?.replace(/[^\d.]/g, '') || '0');

                // Extract broker
                const brokerEl = card.querySelector('div.LoadListItem__Broker-drCAbe');
                const broker = brokerEl?.childNodes[0]?.textContent?.trim() || 'Unknown';

                // Extract pickup date
                const dateEl = card.querySelector('div.Display__StyledBlurred-hvFKYX');
                const pickup_date = dateEl?.textContent?.trim() || '';

                // Generate unique ID (use a combination of fields)
                const id = `${origin}-${destination}-${rate}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

                return {
                    id,
                    origin,
                    destination,
                    rate,
                    distance,
                    weight,
                    equipment,
                    pickup_date,
                    broker,
                    rate_per_mile,
                };
            });
        });

        console.log(`Found ${loads.length} loads`);
        return loads as CloudTrucksLoad[];

    } catch (error) {
        console.error('Error searching for loads:', error);
        return [];
    }
}

/**
 * Main scraping function
 */
export async function scrapeCloudTrucksLoads(
    email: string,
    password: string,
    criteria: SearchCriteria
): Promise<CloudTrucksLoad[]> {
    let browser: Browser | null = null;

    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Login
        const loginSuccess = await login(page, email, password);
        if (!loginSuccess) {
            throw new Error('Failed to login to CloudTrucks');
        }

        // Search for loads
        const loads = await searchLoads(page, criteria);

        // Filter by criteria
        const filteredLoads = loads.filter(load => {
            // Filter by minimum rate
            if (criteria.min_rate && load.rate < criteria.min_rate) {
                return false;
            }

            // Filter by equipment type
            if (criteria.equipment_type && !load.equipment.toLowerCase().includes(criteria.equipment_type.toLowerCase())) {
                return false;
            }

            return true;
        });

        return filteredLoads;

    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
