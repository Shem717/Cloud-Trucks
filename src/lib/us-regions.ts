export interface Region {
    id: string;
    name: string;
    states: string[];
}

export const US_REGIONS: Region[] = [
    {
        id: 'northeast',
        name: 'Northeast',
        states: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA']
    },
    {
        id: 'southeast',
        name: 'Southeast',
        states: ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA']
    },
    {
        id: 'midwest',
        name: 'Midwest',
        states: ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD']
    },
    {
        id: 'southwest',
        name: 'Southwest',
        states: ['AZ', 'NM', 'OK', 'TX']
    },
    {
        id: 'west',
        name: 'West',
        states: ['CO', 'ID', 'MT', 'NV', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA']
    }
];

export function getStatesInRegion(regionId: string): string[] {
    const region = US_REGIONS.find(r => r.id === regionId);
    return region ? region.states : [];
}

export function getRegionForState(stateCode: string): Region | undefined {
    return US_REGIONS.find(r => r.states.includes(stateCode));
}
