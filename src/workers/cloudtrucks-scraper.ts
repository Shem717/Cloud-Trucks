import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { decryptCredentials } from '@/lib/crypto';
import fs from 'fs';

export interface SearchCriteria {
    id: string;
    origin_city: string | null;
    origin_state: string | null;
    pickup_distance: number | null;
    dest_city: string | null;
    destination_state: string | null;
    min_rate: number | null;
    equipment_type: string | null;
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
 * Scrape loads based on criteria (Placeholder for search migration)
 */
export async function scrapeCloudTrucksLoads(
    email: string,
    cookie: string,
    criteria: SearchCriteria
): Promise<CloudTrucksLoad[]> {
    console.log('Search scraping temporarily disabled during migration.');
    return [];
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

        await page.setCookie({
            name: 'ct_session',
            value: cookie,
            domain: '.cloudtrucks.com',
            path: '/',
        });

        await page.goto('https://app.cloudtrucks.com/jobs/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        if (page.url().includes('/login')) {
            throw new Error('Session cookie invalid or expired');
        }

        await new Promise(r => setTimeout(r, 3000));

        const loads = await page.evaluate(() => {
            const jobCards = Array.from(document.querySelectorAll('[class*="JobListItem"]'));

            return jobCards.map((card) => {
                const statusEl = card.querySelector('[class*="Status"]');
                const status = statusEl?.textContent?.trim() || 'Unknown';

                const locationEls = card.querySelectorAll('[class*="Location"], [class*="location"]');
                const origin = locationEls[0]?.textContent?.trim() || '';
                const destination = locationEls[1]?.textContent?.trim() || '';

                const rateEl = card.querySelector('[class*="Price"], [class*="price"], [class*="Rate"]');
                const rateText = rateEl?.textContent?.trim() || '$0';
                const rate = parseFloat(rateText.replace(/[$,]/g, ''));

                const dateEls = card.querySelectorAll('[class*="DateTime"], [class*="Date"], time');
                const pickup_date = dateEls[0]?.textContent?.trim() || '';

                const detailsEl = card.querySelector('[class*="Details"], [class*="details"]');
                const detailsText = detailsEl?.textContent?.trim() || '';
                const parts = detailsText.split(/[|•·]/);
                const equipment = parts[0]?.trim() || 'Dry van';

                const distanceMatch = detailsText.match(/(\d+)\s*mi/);
                const distance = distanceMatch ? parseFloat(distanceMatch[1]) : 0;

                const brokerEl = card.querySelector('[class*="Broker"], [class*="broker"], [class*="Company"]');
                const broker = brokerEl?.textContent?.trim() || 'Unknown';

                const idEl = card.querySelector('[class*="LoadId"], [class*="loadId"], [class*="ID"]');
                const id = idEl?.textContent?.trim()?.replace(/[^0-9]/g, '') ||
                    `${origin}-${destination}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

                return {
                    id, origin, destination, rate, distance,
                    equipment, pickup_date, broker, status,
                    weight: 0, rate_per_mile: distance > 0 ? rate / distance : 0
                };
            }).filter(load => load.origin && load.destination);
        });

        console.log(`Found ${loads.length} booked loads`);
        return loads as CloudTrucksLoad[];

    } catch (error) {
        console.error('Error scraping booked loads:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}
