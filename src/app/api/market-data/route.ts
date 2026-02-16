import { NextResponse } from 'next/server';

/**
 * Free trucking market data aggregator
 *
 * Sources:
 * - FRED API (Federal Reserve Economic Data) — aggregates BLS, EIA, BTS, Cass
 *   Series: GASDESW (diesel), TRUCKD11 (tonnage), PCU484121484121 (PPI TL trucking)
 *   Register free at: https://fred.stlouisfed.org/docs/api/api_key.html
 *   Set FRED_API_KEY in .env.local
 */

interface FredObservation {
    date: string;
    value: string;
}

interface MarketDataResponse {
    diesel: {
        current: number | null;
        previous: number | null;
        changePct: number | null;
        history: { date: string; value: number }[];
        unit: string;
        source: string;
    };
    tonnage: {
        current: number | null;
        previous: number | null;
        changePct: number | null;
        history: { date: string; value: number }[];
        unit: string;
        source: string;
    };
    ppi: {
        current: number | null;
        previous: number | null;
        changePct: number | null;
        history: { date: string; value: number }[];
        unit: string;
        source: string;
    };
    lastUpdated: string;
    dataAvailable: boolean;
}

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

async function fetchFredSeries(
    seriesId: string,
    apiKey: string,
    limit: number = 24
): Promise<FredObservation[]> {
    const url = new URL(FRED_BASE);
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', limit.toString());

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } }); // Cache 1 hour
    if (!res.ok) {
        throw new Error(`FRED API error for ${seriesId}: ${res.status}`);
    }

    const data = await res.json();
    return (data.observations || []).filter(
        (o: FredObservation) => o.value !== '.'
    );
}

function processObservations(observations: FredObservation[]) {
    const history = observations
        .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
        .filter((o) => !isNaN(o.value))
        .reverse(); // chronological order

    const current = history.length > 0 ? history[history.length - 1].value : null;
    const previous = history.length > 1 ? history[history.length - 2].value : null;
    const changePct = current && previous ? ((current - previous) / previous) * 100 : null;

    return { current, previous, changePct, history };
}

export async function GET() {
    const apiKey = process.env.FRED_API_KEY;

    if (!apiKey) {
        // Return structured response with null data so the UI can show a setup prompt
        return NextResponse.json({
            diesel: { current: null, previous: null, changePct: null, history: [], unit: '$/gal', source: 'EIA via FRED' },
            tonnage: { current: null, previous: null, changePct: null, history: [], unit: 'Index', source: 'ATA via FRED' },
            ppi: { current: null, previous: null, changePct: null, history: [], unit: 'Index', source: 'BLS via FRED' },
            lastUpdated: new Date().toISOString(),
            dataAvailable: false,
            setupMessage: 'Set FRED_API_KEY in .env.local to enable real market data. Free at: https://fred.stlouisfed.org/docs/api/api_key.html',
        } satisfies MarketDataResponse & { setupMessage: string });
    }

    try {
        // Fetch all three series in parallel
        const [dieselObs, tonnageObs, ppiObs] = await Promise.all([
            fetchFredSeries('GASDESW', apiKey, 52),      // Weekly diesel price, 1 year
            fetchFredSeries('TRUCKD11', apiKey, 24),     // Monthly truck tonnage, 2 years
            fetchFredSeries('PCU484121484121', apiKey, 24), // Monthly PPI TL trucking, 2 years
        ]);

        const diesel = processObservations(dieselObs);
        const tonnage = processObservations(tonnageObs);
        const ppi = processObservations(ppiObs);

        const response: MarketDataResponse = {
            diesel: { ...diesel, unit: '$/gal', source: 'EIA via FRED' },
            tonnage: { ...tonnage, unit: 'Index', source: 'ATA Truck Tonnage via FRED' },
            ppi: { ...ppi, unit: 'Index', source: 'BLS PPI TL Trucking via FRED' },
            lastUpdated: new Date().toISOString(),
            dataAvailable: true,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('[Market Data API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
            { status: 500 }
        );
    }
}
