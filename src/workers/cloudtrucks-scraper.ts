import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { decryptCredentials } from '@/lib/crypto';
import fs from 'fs';

export interface SearchCriteria {
    id: string;
    origin_city: string | null;
    origin_state: string | null;
    pickup_distance: number | null;
    pickup_date: string | null;
    dest_city: string | null;
    destination_state: string | null;
    min_rate: number | null;
    max_weight: number | null;
    equipment_type: string | null; // 'Dry Van', 'Power Only'
    booking_type: string | null; // 'instant', 'standard'
}

export interface CloudTrucksLoad {
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
    status?: string;
}

// Helper to get browser executable path
const getExecutablePath = async () => {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        return await chromium.executablePath();
    }

    const commonPaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];

    for (const p of commonPaths) {
        if (fs.existsSync(p)) return p;
    }

    throw new Error('Local Chrome/Chromium not found. Please install Google Chrome.');
};

/**
 * Scrape loads from CloudTrucks load board based on search criteria
 */
export async function scrapeCloudTrucksLoads(
    email: string,
    cookie: string,
    criteria: SearchCriteria
): Promise<CloudTrucksLoad[]> {
    let browser: Browser | null = null;

    try {
        const executablePath = await getExecutablePath();
        console.log('[CT Search] Starting browser for search scrape...');

        if (process.env.VERCEL) {
            chromium.setGraphicsMode = false;
        }

        browser = await puppeteer.launch({
            args: process.env.VERCEL ? [
                ...(chromium.args || []),
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ] : [],
            defaultViewport: chromium.defaultViewport as any,
            executablePath: executablePath,
            headless: process.env.VERCEL ? (chromium.headless as any) : true,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setCookie({
            name: 'ct_session',
            value: cookie,
            domain: '.cloudtrucks.com',
            path: '/',
        });

        // Navigate to load board/search page
        // CloudTrucks likely has a loads/search page - try common paths
        const searchUrls = [
            'https://app.cloudtrucks.com/loads',
            'https://app.cloudtrucks.com/load-board',
            'https://app.cloudtrucks.com/search',
            'https://app.cloudtrucks.com/'
        ];

        let searchPageFound = false;
        for (const url of searchUrls) {
            console.log(`[CT Search] Trying URL: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            if (page.url().includes('/login')) {
                throw new Error('Session cookie invalid or expired');
            }

            // Check if this looks like a search/load board page
            const hasSearchElements = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                return text.includes('load') || text.includes('search') || text.includes('pickup');
            });

            if (hasSearchElements) {
                searchPageFound = true;
                console.log(`[CT Search] Found search page at: ${page.url()}`);
                break;
            }
        }

        if (!searchPageFound) {
            console.log('[CT Search] Could not find search page, returning empty results');
            return [];
        }

        // Wait for page to fully load
        await new Promise(r => setTimeout(r, 3000));

        // Try to apply filters if the page has filter UI
        console.log('[CT Search] Attempting to apply search criteria:', criteria);

        // Log page structure for debugging
        const pageDebug = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input, select')).map(el => ({
                type: (el as HTMLInputElement).type,
                name: (el as HTMLInputElement).name,
                placeholder: (el as HTMLInputElement).placeholder,
                className: el.className?.toString()?.slice(0, 50)
            }));
            const buttons = Array.from(document.querySelectorAll('button')).map(el => ({
                text: el.textContent?.trim()?.slice(0, 30),
                className: el.className?.toString()?.slice(0, 50)
            }));
            return { inputs: inputs.slice(0, 20), buttons: buttons.slice(0, 10) };
        });
        console.log('[CT Search] Page form elements:', JSON.stringify(pageDebug, null, 2));

        // Try to type in pickup location
        if (criteria.origin_city) {
            const pickupSelectors = [
                'input[name*="pickup"]',
                'input[name*="origin"]',
                'input[placeholder*="Pickup"]',
                'input[placeholder*="pickup"]',
                'input[placeholder*="Origin"]',
                'input[placeholder*="From"]'
            ];

            for (const selector of pickupSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.type(selector, `${criteria.origin_city}, ${criteria.origin_state || ''}`);
                    console.log(`[CT Search] Entered pickup location using: ${selector}`);
                    break;
                } catch (e) {
                    // Selector not found, try next
                }
            }
        }

        // Wait a bit for any dynamic updates
        await new Promise(r => setTimeout(r, 2000));

        // Try to click search button
        const searchBtnSelectors = [
            'button[type="submit"]',
            'button:has-text("Search")',
            'button:has-text("Find")',
            '[class*="search"] button',
            'button[class*="Search"]'
        ];

        for (const selector of searchBtnSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn) {
                    await btn.click();
                    console.log(`[CT Search] Clicked search button: ${selector}`);
                    await new Promise(r => setTimeout(r, 3000));
                    break;
                }
            } catch (e) {
                // Button not found, try next
            }
        }

        // Now scrape the results
        const loads = await page.evaluate((minRate: number | null) => {
            // Look for load cards in search results
            const selectors = [
                '[class*="LoadCard"]',
                '[class*="load-card"]',
                '[class*="LoadListItem"]',
                '[class*="load-item"]',
                '[data-testid*="load"]',
                'a[href*="/loads/"]',
                '[role="listitem"]',
                'article'
            ];

            let loadCards: Element[] = [];
            for (const selector of selectors) {
                const found = Array.from(document.querySelectorAll(selector));
                if (found.length > 0) {
                    console.log(`Found ${found.length} elements with: ${selector}`);
                    loadCards = found;
                    break;
                }
            }

            return loadCards.map((card) => {
                const cardText = card.textContent || '';

                // Extract locations
                const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*([A-Z]{2})/g;
                const locations = [...cardText.matchAll(locationPattern)].map(m => `${m[1]}, ${m[2]}`);
                const origin = locations[0] || '';
                const destination = locations[1] || '';

                // Extract rate
                const rateMatch = cardText.match(/\$[\d,]+(?:\.\d{2})?/);
                const rateText = rateMatch ? rateMatch[0] : '$0';
                const rate = parseFloat(rateText.replace(/[$,]/g, '')) || 0;

                // Filter by min rate if specified
                if (minRate && rate < minRate) {
                    return null;
                }

                // Extract date
                const dateMatch = cardText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
                const pickup_date = dateMatch ? dateMatch[0] : '';

                // Extract distance
                const distanceMatch = cardText.match(/(\d+)\s*mi/i);
                const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;

                // Extract equipment
                const equipmentPatterns = ['Dry Van', 'Dry van', 'Power Only'];
                let equipment = 'Dry Van';
                for (const pattern of equipmentPatterns) {
                    if (cardText.includes(pattern)) {
                        equipment = pattern;
                        break;
                    }
                }

                // Extract broker
                const brokerPatterns = ['AFN', 'Circle 8', 'WORLDWIDE', 'GLOBALTRANZ', 'CH Robinson', 'TQL'];
                let broker = 'Unknown';
                for (const pattern of brokerPatterns) {
                    if (cardText.includes(pattern)) {
                        broker = pattern;
                        break;
                    }
                }

                // Extract ID from URL
                const href = card.querySelector('a[href*="/loads/"]')?.getAttribute('href') || '';
                const idFromUrl = href.match(/\/loads\/([^/]+)/)?.[1] || '';
                const id = idFromUrl || `${origin}-${destination}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

                // Check for instant book indicator
                const isInstantBook = cardText.toLowerCase().includes('instant');

                return {
                    id, origin, destination, rate, distance,
                    equipment, pickup_date, broker,
                    status: isInstantBook ? 'instant' : 'standard',
                    weight: 0,
                    rate_per_mile: distance > 0 ? rate / distance : 0
                };
            }).filter((load): load is NonNullable<typeof load> => load !== null && (load.origin !== '' || load.destination !== ''));
        }, criteria.min_rate);

        console.log(`[CT Search] Found ${loads.length} loads matching criteria`);
        return loads as CloudTrucksLoad[];

    } catch (error) {
        console.error('[CT Search] Error scraping loads:', error);
        return []; // Return empty array instead of throwing to allow other criteria to continue
    } finally {
        if (browser) await browser.close();
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
        const executablePath = await getExecutablePath();
        console.log('[CT Scraper] Starting browser with executable:', executablePath);

        if (process.env.VERCEL) {
            chromium.setGraphicsMode = false;
        }

        browser = await puppeteer.launch({
            args: process.env.VERCEL ? [
                ...(chromium.args || []),
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ] : [],
            defaultViewport: chromium.defaultViewport as any,
            executablePath: executablePath,
            headless: process.env.VERCEL ? (chromium.headless as any) : true,
        });

        const page = await browser.newPage();

        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setCookie({
            name: 'ct_session',
            value: cookie,
            domain: '.cloudtrucks.com',
            path: '/',
        });

        console.log('[CT Scraper] Navigating to /jobs/...');
        await page.goto('https://app.cloudtrucks.com/jobs/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        const currentUrl = page.url();
        console.log('[CT Scraper] Current URL after navigation:', currentUrl);

        if (currentUrl.includes('/login')) {
            throw new Error('Session cookie invalid or expired - redirected to login');
        }

        // Wait for content to load - try multiple possible selectors
        console.log('[CT Scraper] Waiting for page content...');
        await new Promise(r => setTimeout(r, 5000)); // Increased wait time

        // Debug: Log page structure to understand what's there
        const debugInfo = await page.evaluate(() => {
            const body = document.body;

            // Get all elements with job-related class names
            const allElements = Array.from(document.querySelectorAll('*'));
            const jobRelated = allElements.filter(el => {
                const className = el.className?.toString?.() || '';
                const id = el.id || '';
                return className.toLowerCase().includes('job') ||
                       className.toLowerCase().includes('load') ||
                       className.toLowerCase().includes('card') ||
                       id.toLowerCase().includes('job') ||
                       id.toLowerCase().includes('load');
            }).map(el => ({
                tag: el.tagName,
                className: el.className?.toString?.()?.slice(0, 100),
                id: el.id,
                childCount: el.children.length
            }));

            // Also look for common list/card patterns
            const lists = Array.from(document.querySelectorAll('ul, ol, [role="list"]')).map(el => ({
                tag: el.tagName,
                className: el.className?.toString?.()?.slice(0, 100),
                childCount: el.children.length
            }));

            // Check for any "no jobs" or empty state messaging
            const textContent = body.innerText.slice(0, 2000);

            return {
                title: document.title,
                jobRelatedElements: jobRelated.slice(0, 20),
                lists: lists.slice(0, 10),
                pageTextSnippet: textContent,
                totalElements: allElements.length
            };
        });

        console.log('[CT Scraper] Page debug info:', JSON.stringify(debugInfo, null, 2));

        // Try multiple selector strategies to find job cards
        const loads = await page.evaluate(() => {
            // Strategy 1: Look for job cards by various class patterns
            const selectors = [
                '[class*="JobListItem"]',
                '[class*="job-card"]',
                '[class*="JobCard"]',
                '[class*="load-card"]',
                '[class*="LoadCard"]',
                '[data-testid*="job"]',
                '[data-testid*="load"]',
                'a[href*="/jobs/details/"]', // Links to job details
                '[class*="ListItem"]',
                'article',
                '[role="listitem"]'
            ];

            let jobCards: Element[] = [];
            for (const selector of selectors) {
                const found = Array.from(document.querySelectorAll(selector));
                if (found.length > 0) {
                    console.log(`Found ${found.length} elements with selector: ${selector}`);
                    jobCards = found;
                    break;
                }
            }

            // If still nothing, try finding by href pattern
            if (jobCards.length === 0) {
                const links = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
                jobCards = links.map(link => link.closest('div, article, li, section') || link).filter(Boolean) as Element[];
            }

            return jobCards.map((card) => {
                // Extract text content and try to parse job info
                const cardText = card.textContent || '';
                const cardHtml = card.outerHTML.slice(0, 500);

                // Try to find status
                const statusPatterns = ['In progress', 'Active', 'Completed', 'Pending', 'Booked'];
                let status = 'Unknown';
                for (const pattern of statusPatterns) {
                    if (cardText.includes(pattern)) {
                        status = pattern;
                        break;
                    }
                }

                // Extract locations - look for city, state patterns
                const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*([A-Z]{2})/g;
                const locations = [...cardText.matchAll(locationPattern)].map(m => `${m[1]}, ${m[2]}`);
                const origin = locations[0] || '';
                const destination = locations[1] || '';

                // Extract rate - look for dollar amounts
                const rateMatch = cardText.match(/\$[\d,]+(?:\.\d{2})?/);
                const rateText = rateMatch ? rateMatch[0] : '$0';
                const rate = parseFloat(rateText.replace(/[$,]/g, '')) || 0;

                // Extract date patterns
                const dateMatch = cardText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
                const pickup_date = dateMatch ? dateMatch[0] : '';

                // Extract distance
                const distanceMatch = cardText.match(/(\d+)\s*mi/i);
                const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;

                // Extract equipment type
                const equipmentPatterns = ['Dry Van', 'Dry van', 'Reefer', 'Flatbed', 'Power Only'];
                let equipment = 'Dry Van';
                for (const pattern of equipmentPatterns) {
                    if (cardText.includes(pattern)) {
                        equipment = pattern;
                        break;
                    }
                }

                // Try to extract broker name
                const brokerPatterns = ['AFN', 'Circle 8', 'WORLDWIDE', 'GLOBALTRANZ', 'CH Robinson', 'TQL'];
                let broker = 'Unknown';
                for (const pattern of brokerPatterns) {
                    if (cardText.includes(pattern)) {
                        broker = pattern;
                        break;
                    }
                }

                // Try to extract load ID from URL or text
                const href = card.querySelector('a[href*="/jobs/details/"]')?.getAttribute('href') || '';
                const idFromUrl = href.match(/\/jobs\/details\/([^/]+)/)?.[1] || '';
                const id = idFromUrl || `${origin}-${destination}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

                return {
                    id, origin, destination, rate, distance,
                    equipment, pickup_date, broker, status,
                    weight: 0,
                    rate_per_mile: distance > 0 ? rate / distance : 0,
                    _debug: { cardText: cardText.slice(0, 200), cardHtml }
                };
            }).filter(load => load.origin || load.destination || load.rate > 0);
        });

        console.log(`[CT Scraper] Found ${loads.length} booked loads`);
        if (loads.length > 0) {
            console.log('[CT Scraper] First load sample:', JSON.stringify(loads[0], null, 2));
        }

        // Remove debug info before returning
        const cleanLoads = loads.map(({ _debug, ...load }) => load);
        return cleanLoads as CloudTrucksLoad[];

    } catch (error) {
        console.error('[CT Scraper] Error scraping booked loads:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}
