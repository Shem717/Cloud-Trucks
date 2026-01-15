import { chromium, Browser, Page } from 'playwright';
import { decryptCredentials } from '@/lib/crypto';

interface SearchCriteria {
    id: string;
    origin_city: string | null;
    origin_state: string | null;
    pickup_distance: number | null;
    dest_city: string | null;
    destination_state: string | null;
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

// ... existing code ...

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
        if (criteria.origin_city || criteria.origin_state) {
            const pickupInput = page.locator('input[placeholder="Enter Location"]').first();
            await pickupInput.click();

            // Build query string like "San Jose, CA" or just "CA" or just "San Jose"
            const query = [criteria.origin_city, criteria.origin_state].filter(Boolean).join(', ');
            await pickupInput.fill(query);
            await page.waitForTimeout(1000);

            // Select from autocomplete
            const suggestion = page.locator('.multistop-path-item-location').first();
            if (await suggestion.isVisible({ timeout: 3000 })) {
                await suggestion.click();
            }

            // Set pickup radius if specified
            if (criteria.pickup_distance !== null && criteria.pickup_distance !== 50) { // 50 is default
                try {
                    // Look for the radius dropdown (assuming it contains "within")
                    // This is heuristic and may need adjustment based on real DOM
                    const radiusDropdown = page.getByText(/within \d+ mi/).first();
                    if (await radiusDropdown.isVisible()) {
                        await radiusDropdown.click();
                        await page.getByText(`within ${criteria.pickup_distance} mi`).click();
                    }
                } catch (e) {
                    console.log('Could not set pickup radius:', e);
                }
            }
        }

        // Enter dropoff location if specified
        if (criteria.dest_city || criteria.destination_state) {
            const dropoffInput = page.locator('input[placeholder="Enter Location"]').nth(1);
            await dropoffInput.click();

            // Build query string
            const query = [criteria.dest_city, criteria.destination_state].filter(Boolean).join(', ');
            await dropoffInput.fill(query);
            await page.waitForTimeout(1000);

            // Select from autocomplete
            const suggestion = page.locator('.multistop-path-item-location').first();
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
    cookie: string,
    criteria: SearchCriteria
): Promise<CloudTrucksLoad[]> {
    let browser: Browser | null = null;

    try {
        browser = await chromium.launch({ headless: true });

        // Create a context with the session cookie injected
        const context = await browser.newContext();
        await context.addCookies([{
            name: 'ct_session',
            value: cookie,
            domain: '.cloudtrucks.com',
            path: '/',
        }]);

        const page = await context.newPage();

        console.log(`Initialized session for ${email}`);

        // Navigate directly to dashboard/search to verify session
        await page.goto('https://app.cloudtrucks.com/search/', { waitUntil: 'networkidle' });

        // if we are redirected to login, the cookie is invalid
        if (page.url().includes('/login')) {
            throw new Error('Session cookie invalid or expired');
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

/**
 * Scrape booked/active loads from CloudTrucks "Your Jobs" page
 */
export async function scrapeBookedLoads(
    cookie: string
): Promise<CloudTrucksLoad[]> {
    let browser: Browser | null = null;

    try {
        browser = await chromium.launch({ headless: true });

        const context = await browser.newContext();
        await context.addCookies([{
            name: 'ct_session',
            value: cookie,
            domain: '.cloudtrucks.com',
            path: '/',
        }]);

        const page = await context.newPage();

        // Navigate to "Your Jobs" page
        await page.goto('https://app.cloudtrucks.com/jobs/', { waitUntil: 'networkidle' });

        // Check if session is valid
        if (page.url().includes('/login')) {
            throw new Error('Session cookie invalid or expired');
        }

        await page.waitForTimeout(2000);

        // Extract booked loads from the page
        const loads = await page.evaluate(() => {
            const jobCards = Array.from(document.querySelectorAll('[class*="JobListItem"]'));

            return jobCards.map((card) => {
                // Extract status (In progress, Completed, etc.)
                const statusEl = card.querySelector('[class*="Status"]');
                const status = statusEl?.textContent?.trim() || 'Unknown';

                // Extract locations
                const locationEls = card.querySelectorAll('[class*="Location"], [class*="location"]');
                const origin = locationEls[0]?.textContent?.trim() || '';
                const destination = locationEls[1]?.textContent?.trim() || '';

                // Extract rate
                const rateEl = card.querySelector('[class*="Price"], [class*="price"], [class*="Rate"]');
                const rateText = rateEl?.textContent?.trim() || '$0';
                const rate = parseFloat(rateText.replace(/[$,]/g, ''));

                // Extract date/time
                const dateEls = card.querySelectorAll('[class*="DateTime"], [class*="Date"], time');
                const pickup_date = dateEls[0]?.textContent?.trim() || '';

                // Extract equipment and distance
                const detailsEl = card.querySelector('[class*="Details"], [class*="details"]');
                const detailsText = detailsEl?.textContent?.trim() || '';
                const parts = detailsText.split(/[|•·]/);
                const equipment = parts[0]?.trim() || 'Dry van';
                const distanceMatch = detailsText.match(/(\d+)\s*mi/);
                const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;
                const weightMatch = detailsText.match(/(\d+)\s*lbs?/);
                const weight = weightMatch ? parseFloat(weightMatch[1]) : 0;

                // Extract broker
                const brokerEl = card.querySelector('[class*="Broker"], [class*="broker"], [class*="Company"]');
                const broker = brokerEl?.textContent?.trim() || 'Unknown';

                // Extract load ID if available
                const idEl = card.querySelector('[class*="LoadId"], [class*="loadId"], [class*="ID"]');
                const id = idEl?.textContent?.trim()?.replace(/[^0-9]/g, '') ||
                    `${origin}-${destination}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

                // Calculate rate per mile
                const rate_per_mile = distance > 0 ? rate / distance : 0;

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
                    status,
                };
            }).filter(load => load.origin && load.destination); // Filter out empty entries
        });

        console.log(`Found ${loads.length} booked loads`);
        return loads as CloudTrucksLoad[];

    } catch (error) {
        console.error('Error scraping booked loads:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
