import { renderHook, act, waitFor } from '@testing-library/react';
import { usePreferences, useDefaultSort, useFuelSettings, useBackhaulSettings } from '../use-preferences';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
    getItem: jest.fn((key: string) => mockStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
    clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
    length: 0,
    key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const MOCK_PREFERENCES = {
    id: 'pref-1',
    user_id: 'user-1',
    default_sort: 'newest' as const,
    preferred_min_rate: null,
    preferred_min_rpm: null,
    preferred_max_weight: null,
    preferred_min_weight: null,
    preferred_equipment_type: null,
    preferred_booking_type: null,
    preferred_pickup_distance: 50,
    home_city: null,
    home_state: null,
    preferred_destination_states: null,
    avoid_states: null,
    auto_suggest_backhauls: true,
    backhaul_max_deadhead: 100,
    backhaul_min_rpm: 2.00,
    fuel_mpg: 6.5,
    fuel_price_per_gallon: 3.80,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

describe('usePreferences', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    it('fetches preferences from API on mount', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ preferences: MOCK_PREFERENCES }),
        });

        const { result } = renderHook(() => usePreferences());

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.preferences).toEqual(MOCK_PREFERENCES);
        expect(result.current.error).toBeNull();
    });

    it('falls back to localStorage when API returns 401', async () => {
        const storedPrefs = { default_sort: 'price_high', fuel_mpg: 7.0 };
        mockStorage['cloudtrucks_preferences'] = JSON.stringify(storedPrefs);

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
        });

        const { result } = renderHook(() => usePreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.preferences?.default_sort).toBe('price_high');
        expect(result.current.preferences?.fuel_mpg).toBe(7.0);
    });

    it('uses defaults when API fails and no localStorage', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => usePreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.preferences?.default_sort).toBe('newest');
        expect(result.current.preferences?.fuel_mpg).toBe(6.5);
    });

    it('performs optimistic update on updatePreferences', async () => {
        // Initial fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ preferences: MOCK_PREFERENCES }),
        });

        const { result } = renderHook(() => usePreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Update call
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                preferences: { ...MOCK_PREFERENCES, fuel_mpg: 8.0 },
            }),
        });

        await act(async () => {
            await result.current.updatePreferences({ fuel_mpg: 8.0 });
        });

        expect(result.current.preferences?.fuel_mpg).toBe(8.0);
    });

    it('saves to localStorage when API returns 401 on update', async () => {
        // Initial fetch returns 401
        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

        const { result } = renderHook(() => usePreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Update returns 401
        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await act(async () => {
            await result.current.updatePreferences({ fuel_mpg: 9.0 });
        });

        expect(localStorageMock.setItem).toHaveBeenCalled();
    });
});

describe('useDefaultSort', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    it('returns default sort as "newest" initially', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useDefaultSort());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.defaultSort).toBe('newest');
    });

    it('provides setDefaultSort function', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ preferences: MOCK_PREFERENCES }),
        });

        const { result } = renderHook(() => useDefaultSort());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(typeof result.current.setDefaultSort).toBe('function');
    });
});

describe('useFuelSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    it('returns default fuel settings', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useFuelSettings());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.mpg).toBe(6.5);
        expect(result.current.fuelPrice).toBe(3.80);
    });

    it('updates fuel settings via updateFuelSettings', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ preferences: MOCK_PREFERENCES }),
        });

        const { result } = renderHook(() => useFuelSettings());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                preferences: { ...MOCK_PREFERENCES, fuel_mpg: 7.5, fuel_price_per_gallon: 4.20 },
            }),
        });

        await act(async () => {
            await result.current.updateFuelSettings(7.5, 4.20);
        });

        expect(result.current.mpg).toBe(7.5);
        expect(result.current.fuelPrice).toBe(4.20);
    });
});

describe('useBackhaulSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    it('returns default backhaul settings', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useBackhaulSettings());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.autoSuggest).toBe(true);
        expect(result.current.maxDeadhead).toBe(100);
        expect(result.current.minRpm).toBe(2.00);
        expect(result.current.preferredStates).toEqual([]);
        expect(result.current.avoidStates).toEqual([]);
    });
});
