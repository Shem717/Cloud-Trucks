'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, SortOption } from '@/app/api/preferences/route';

// Local storage key for guest/offline fallback
const LOCAL_STORAGE_KEY = 'cloudtrucks_preferences';

// Default preferences for new users
const DEFAULT_PREFERENCES: Partial<UserPreferences> = {
    default_sort: 'newest',
    preferred_pickup_distance: 50,
    auto_suggest_backhauls: true,
    backhaul_max_deadhead: 100,
    backhaul_min_rpm: 2.00,
    fuel_mpg: 6.5,
    fuel_price_per_gallon: 3.80,
};

interface UsePreferencesReturn {
    preferences: UserPreferences | null;
    isLoading: boolean;
    error: string | null;
    updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
    refreshPreferences: () => Promise<void>;
}

/**
 * Hook for managing user preferences
 * - Fetches preferences from API on mount
 * - Provides optimistic updates
 * - Falls back to localStorage for guests
 */
export function usePreferences(): UsePreferencesReturn {
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load preferences from localStorage (fallback)
    const loadFromLocalStorage = useCallback((): Partial<UserPreferences> | null => {
        if (typeof window === 'undefined') return null;
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }, []);

    // Save preferences to localStorage (fallback)
    const saveToLocalStorage = useCallback((prefs: Partial<UserPreferences>) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
        } catch {
            // Ignore storage errors
        }
    }, []);

    // Fetch preferences from API
    const fetchPreferences = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/preferences');

            if (response.status === 401) {
                // User not authenticated, use localStorage
                const localPrefs = loadFromLocalStorage();
                setPreferences({
                    ...DEFAULT_PREFERENCES,
                    ...localPrefs,
                } as UserPreferences);
                return;
            }

            if (!response.ok) {
                // API failed (table might not exist yet), use localStorage fallback
                console.warn('Preferences API returned error, using defaults');
                const localPrefs = loadFromLocalStorage();
                setPreferences({
                    ...DEFAULT_PREFERENCES,
                    ...localPrefs,
                } as UserPreferences);
                return;
            }

            const data = await response.json();
            setPreferences(data.preferences);

            // Also save to localStorage as cache
            saveToLocalStorage(data.preferences);

        } catch (err) {
            console.error('Error fetching preferences:', err);
            // Don't set error state for expected failures (table not created yet)
            // Just use defaults

            // Try localStorage fallback
            const localPrefs = loadFromLocalStorage();
            setPreferences({
                ...DEFAULT_PREFERENCES,
                ...localPrefs,
            } as UserPreferences);
        } finally {
            setIsLoading(false);
        }
    }, [loadFromLocalStorage, saveToLocalStorage]);

    // Update preferences
    const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
        try {
            // Optimistic update
            setPreferences(prev => prev ? { ...prev, ...updates } : null);

            const response = await fetch('/api/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (response.status === 401) {
                // User not authenticated, save to localStorage only
                const current = loadFromLocalStorage() || {};
                saveToLocalStorage({ ...current, ...updates });
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to update preferences');
            }

            const data = await response.json();
            setPreferences(data.preferences);
            saveToLocalStorage(data.preferences);

        } catch (err) {
            console.error('Error updating preferences:', err);
            setError(err instanceof Error ? err.message : 'Failed to update preferences');

            // Revert on error
            await fetchPreferences();
        }
    }, [fetchPreferences, loadFromLocalStorage, saveToLocalStorage]);

    // Initial fetch
    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    return {
        preferences,
        isLoading,
        error,
        updatePreferences,
        refreshPreferences: fetchPreferences,
    };
}

/**
 * Hook for just the default sort preference
 * Lightweight version for dashboard-feed
 */
export function useDefaultSort(): {
    defaultSort: SortOption;
    setDefaultSort: (sort: SortOption) => Promise<void>;
    isLoading: boolean;
} {
    const { preferences, updatePreferences, isLoading } = usePreferences();

    const setDefaultSort = useCallback(async (sort: SortOption) => {
        await updatePreferences({ default_sort: sort });
    }, [updatePreferences]);

    return {
        defaultSort: (preferences?.default_sort as SortOption) || 'newest',
        setDefaultSort,
        isLoading,
    };
}

/**
 * Hook for fuel settings
 * Provides backward compatibility with existing fuel settings dialog
 */
export function useFuelSettings(): {
    mpg: number;
    fuelPrice: number;
    updateFuelSettings: (mpg: number, fuelPrice: number) => Promise<void>;
    isLoading: boolean;
} {
    const { preferences, updatePreferences, isLoading } = usePreferences();

    const updateFuelSettings = useCallback(async (mpg: number, fuelPrice: number) => {
        await updatePreferences({
            fuel_mpg: mpg,
            fuel_price_per_gallon: fuelPrice,
        });
    }, [updatePreferences]);

    return {
        mpg: preferences?.fuel_mpg || 6.5,
        fuelPrice: preferences?.fuel_price_per_gallon || 3.80,
        updateFuelSettings,
        isLoading,
    };
}

/**
 * Hook for backhaul settings
 */
export function useBackhaulSettings(): {
    autoSuggest: boolean;
    maxDeadhead: number;
    minRpm: number;
    preferredStates: string[];
    avoidStates: string[];
    updateBackhaulSettings: (settings: {
        auto_suggest_backhauls?: boolean;
        backhaul_max_deadhead?: number;
        backhaul_min_rpm?: number;
        preferred_destination_states?: string[];
        avoid_states?: string[];
    }) => Promise<void>;
    isLoading: boolean;
} {
    const { preferences, updatePreferences, isLoading } = usePreferences();

    const updateBackhaulSettings = useCallback(async (settings: {
        auto_suggest_backhauls?: boolean;
        backhaul_max_deadhead?: number;
        backhaul_min_rpm?: number;
        preferred_destination_states?: string[];
        avoid_states?: string[];
    }) => {
        await updatePreferences(settings);
    }, [updatePreferences]);

    return {
        autoSuggest: preferences?.auto_suggest_backhauls ?? true,
        maxDeadhead: preferences?.backhaul_max_deadhead || 100,
        minRpm: preferences?.backhaul_min_rpm || 2.00,
        preferredStates: preferences?.preferred_destination_states || [],
        avoidStates: preferences?.avoid_states || [],
        updateBackhaulSettings,
        isLoading,
    };
}
