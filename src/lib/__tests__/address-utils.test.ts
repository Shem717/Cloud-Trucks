import {
    extractStopAddress,
    extractLoadAddresses,
    formatAddress,
    openInMaps,
    StopData,
    ExtractedAddress,
} from '../address-utils';

describe('address-utils', () => {
    // ─── extractStopAddress ──────────────────────────────────────────

    describe('extractStopAddress', () => {
        it('returns empty fields for null input', () => {
            const result = extractStopAddress(null);
            expect(result).toEqual({
                address: '',
                city: '',
                state: '',
                zip: '',
                cityStateZip: '',
                hasAddress: false,
            });
        });

        it('returns empty fields for undefined input', () => {
            const result = extractStopAddress(undefined);
            expect(result.hasAddress).toBe(false);
            expect(result.city).toBe('');
        });

        it('extracts from location_* prefixed fields', () => {
            const stop: StopData = {
                location_address1: '123 Main St',
                location_city: 'Los Angeles',
                location_state: 'CA',
                location_zip: '90001',
                location_lat: 34.0522,
                location_long: -118.2437,
            };
            const result = extractStopAddress(stop);

            expect(result.address).toBe('123 Main St');
            expect(result.city).toBe('Los Angeles');
            expect(result.state).toBe('CA');
            expect(result.zip).toBe('90001');
            expect(result.lat).toBe(34.0522);
            expect(result.lon).toBe(-118.2437);
            expect(result.hasAddress).toBe(true);
            expect(result.cityStateZip).toBe('Los Angeles, CA 90001');
        });

        it('falls back to short field names when location_* missing', () => {
            const stop: StopData = {
                address: '456 Oak Ave',
                city: 'Phoenix',
                state: 'AZ',
                zip: '85001',
            };
            const result = extractStopAddress(stop);

            expect(result.address).toBe('456 Oak Ave');
            expect(result.city).toBe('Phoenix');
            expect(result.state).toBe('AZ');
        });

        it('prefers location_* fields over short names', () => {
            const stop: StopData = {
                location_city: 'Los Angeles',
                city: 'Phoenix',
                location_state: 'CA',
                state: 'AZ',
            };
            const result = extractStopAddress(stop);

            expect(result.city).toBe('Los Angeles');
            expect(result.state).toBe('CA');
        });

        it('joins address1 and address2', () => {
            const stop: StopData = {
                location_address1: '123 Main St',
                location_address2: 'Suite 100',
            };
            const result = extractStopAddress(stop);
            expect(result.address).toBe('123 Main St, Suite 100');
        });

        it('omits zip from cityStateZip when empty', () => {
            const stop: StopData = {
                location_city: 'Dallas',
                location_state: 'TX',
            };
            const result = extractStopAddress(stop);
            expect(result.cityStateZip).toBe('Dallas, TX');
        });

        it('uses location_lon as fallback for lon', () => {
            const stop: StopData = {
                location_lat: 33.4484,
                location_lon: -112.074,
            };
            const result = extractStopAddress(stop);
            expect(result.lon).toBe(-112.074);
        });

        it('hasAddress is false when address is empty/whitespace', () => {
            const stop: StopData = {
                location_city: 'Denver',
                location_state: 'CO',
            };
            const result = extractStopAddress(stop);
            expect(result.hasAddress).toBe(false);
        });
    });

    // ─── extractLoadAddresses ────────────────────────────────────────

    describe('extractLoadAddresses', () => {
        it('extracts from stops array using type field', () => {
            const details = {
                stops: [
                    { type: 'ORIGIN', location_city: 'LA', location_state: 'CA', location_address1: '100 W 1st St' },
                    { type: 'DESTINATION', location_city: 'PHX', location_state: 'AZ', location_address1: '200 E Van Buren' },
                ] as StopData[],
            };
            const result = extractLoadAddresses(details);

            expect(result.origin.city).toBe('LA');
            expect(result.destination.city).toBe('PHX');
        });

        it('extracts using type_detail (PICKUP/DELIVERY)', () => {
            const details = {
                stops: [
                    { type_detail: 'PICKUP', location_city: 'Chicago', location_state: 'IL', location_address1: '1 Wacker Dr' },
                    { type_detail: 'DELIVERY', location_city: 'Detroit', location_state: 'MI', location_address1: '1 Campus Martius' },
                ] as StopData[],
            };
            const result = extractLoadAddresses(details);

            expect(result.origin.city).toBe('Chicago');
            expect(result.destination.city).toBe('Detroit');
        });

        it('falls back to top-level fields when no stops', () => {
            const details = {
                origin_city: 'Atlanta',
                origin_state: 'GA',
                origin_address: '1 Peachtree St',
                dest_city: 'Miami',
                dest_state: 'FL',
                dest_address: '100 Biscayne Blvd',
            };
            const result = extractLoadAddresses(details);

            expect(result.origin.city).toBe('Atlanta');
            expect(result.origin.address).toBe('1 Peachtree St');
            expect(result.destination.city).toBe('Miami');
        });

        it('handles empty stops array', () => {
            const details = {
                stops: [] as StopData[],
                origin_city: 'Seattle',
                origin_state: 'WA',
            };
            const result = extractLoadAddresses(details);
            expect(result.origin.city).toBe('Seattle');
        });

        it('handles missing stops property entirely', () => {
            const details = {
                origin_city: 'Portland',
                origin_state: 'OR',
                dest_city: 'Boise',
                dest_state: 'ID',
            };
            const result = extractLoadAddresses(details);
            expect(result.origin.city).toBe('Portland');
            expect(result.destination.city).toBe('Boise');
        });
    });

    // ─── formatAddress ───────────────────────────────────────────────

    describe('formatAddress', () => {
        it('returns full address with cityStateZip when hasAddress', () => {
            const extracted: ExtractedAddress = {
                address: '123 Main St',
                city: 'Los Angeles',
                state: 'CA',
                zip: '90001',
                cityStateZip: 'Los Angeles, CA 90001',
                hasAddress: true,
            };
            expect(formatAddress(extracted)).toBe('123 Main St, Los Angeles, CA 90001');
        });

        it('returns cityStateZip when no address', () => {
            const extracted: ExtractedAddress = {
                address: '',
                city: 'Phoenix',
                state: 'AZ',
                zip: '',
                cityStateZip: 'Phoenix, AZ',
                hasAddress: false,
            };
            expect(formatAddress(extracted)).toBe('Phoenix, AZ');
        });

        it('returns "Address not available" when no address and no cityStateZip', () => {
            const extracted: ExtractedAddress = {
                address: '',
                city: '',
                state: '',
                zip: '',
                cityStateZip: '',
                hasAddress: false,
            };
            expect(formatAddress(extracted)).toBe('Address not available');
        });
    });

    // ─── openInMaps ──────────────────────────────────────────────────

    describe('openInMaps', () => {
        let windowOpenSpy: jest.SpyInstance;

        beforeEach(() => {
            windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
        });

        afterEach(() => {
            windowOpenSpy.mockRestore();
        });

        it('opens with lat/lon when available', () => {
            const extracted: ExtractedAddress = {
                address: '123 Main St',
                city: 'LA',
                state: 'CA',
                zip: '',
                cityStateZip: 'LA, CA',
                lat: 34.0522,
                lon: -118.2437,
                hasAddress: true,
            };
            openInMaps(extracted);
            expect(windowOpenSpy).toHaveBeenCalledWith(
                'https://www.google.com/maps/search/?api=1&query=34.0522,-118.2437',
                '_blank'
            );
        });

        it('opens with encoded address when no lat/lon', () => {
            const extracted: ExtractedAddress = {
                address: '123 Main St',
                city: 'LA',
                state: 'CA',
                zip: '',
                cityStateZip: 'LA, CA',
                hasAddress: true,
            };
            openInMaps(extracted);
            expect(windowOpenSpy).toHaveBeenCalledWith(
                expect.stringContaining('google.com/maps'),
                '_blank'
            );
        });

        it('does nothing when no lat/lon and no address', () => {
            const extracted: ExtractedAddress = {
                address: '',
                city: '',
                state: '',
                zip: '',
                cityStateZip: '',
                hasAddress: false,
            };
            openInMaps(extracted);
            expect(windowOpenSpy).not.toHaveBeenCalled();
        });
    });
});
