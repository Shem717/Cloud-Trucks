import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadDetailView } from '../load-detail-view';

// Mock child modules that have complex dependencies
jest.mock('@/components/load-card-modules', () => ({
    FinancialsModule: ({ tripRate }: any) => <div data-testid="financials-module">Rate: {tripRate}</div>,
    LogisticsModule: ({ weight }: any) => <div data-testid="logistics-module">Weight: {weight}</div>,
    TrustModule: ({ brokerName }: any) => <div data-testid="trust-module">Broker: {brokerName}</div>,
    AddressModule: ({ originCity, destCity }: any) => (
        <div data-testid="address-module">{originCity} → {destCity}</div>
    ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    X: () => <span data-testid="icon-x" />,
    Map: () => <span data-testid="icon-map" />,
    Star: () => <span data-testid="icon-star" />,
    Share2: () => <span data-testid="icon-share" />,
    Phone: () => <span data-testid="icon-phone" />,
    Mail: () => <span data-testid="icon-mail" />,
    ExternalLink: () => <span data-testid="icon-external-link" />,
}));

const MOCK_LOAD = {
    id: 'load-abc12345-full-uuid-here',
    origin_city: 'Los Angeles',
    origin_state: 'CA',
    origin_address: '123 Main St',
    dest_city: 'Phoenix',
    dest_state: 'AZ',
    dest_address: '456 Oak Ave',
    rate: 2500,
    trip_rate: '2500',
    distance: 370,
    trip_distance_mi: 370,
    weight: 42000,
    truck_weight_lb: 42000,
    equipment: ['Van'],
    pickup_date: '2026-02-20',
    delivery_date: '2026-02-21',
    broker_name: 'Test Broker',
    broker_mc_number: 'MC-123456',
    contact_phone: '555-1234',
    contact_email: 'broker@test.com',
    origin_deadhead_mi: 15,
    dest_deadhead_mi: 20,
    truck_length_ft: 53,
    trailer_drop_warnings: [],
    is_team_load: false,
    has_auto_bid: false,
    stops: [],
    estimated_toll_cost: 25,
    estimated_revenue_per_hour: 45.50,
};

describe('LoadDetailView', () => {
    const defaultProps = {
        load: MOCK_LOAD as any,
        onClose: jest.fn(),
        onToggleSaved: jest.fn(),
        isSaved: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the Load Details header', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByText('Load Details')).toBeInTheDocument();
    });

    it('displays the load ID badge (first 8 chars)', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByText('load-abc')).toBeInTheDocument();
    });

    it('displays rate and RPM', () => {
        render(<LoadDetailView {...defaultProps} />);
        // Rate: $2,500
        expect(screen.getByText(/2,500/)).toBeInTheDocument();
        // RPM: $6.76/mi (2500/370)
        expect(screen.getByText(/6\.76\/mi/)).toBeInTheDocument();
    });

    it('displays distance', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByText(/370mi/)).toBeInTheDocument();
    });

    it('renders three tabs: Details, Map, Financials', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByText('Details')).toBeInTheDocument();
        expect(screen.getByText('Map')).toBeInTheDocument();
        expect(screen.getByText('Financials')).toBeInTheDocument();
    });

    it('renders AddressModule in details tab', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByTestId('address-module')).toBeInTheDocument();
    });

    it('renders LogisticsModule in details tab', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByTestId('logistics-module')).toBeInTheDocument();
    });

    it('renders TrustModule in details tab', () => {
        render(<LoadDetailView {...defaultProps} />);
        expect(screen.getByTestId('trust-module')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        render(<LoadDetailView {...defaultProps} />);
        const closeButton = screen.getByTestId('icon-x').closest('button');
        expect(closeButton).toBeTruthy();
        fireEvent.click(closeButton!);
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onToggleSaved when star button is clicked', () => {
        render(<LoadDetailView {...defaultProps} />);
        const starButton = screen.getByTestId('icon-star').closest('button');
        expect(starButton).toBeTruthy();
        fireEvent.click(starButton!);
        expect(defaultProps.onToggleSaved).toHaveBeenCalledTimes(1);
    });

    it('returns null for falsy load', () => {
        const { container } = render(
            <LoadDetailView {...defaultProps} load={null as any} />
        );
        expect(container.innerHTML).toBe('');
    });

    it('applies saved styling when isSaved is true', () => {
        render(<LoadDetailView {...defaultProps} isSaved={true} />);
        const starButton = screen.getByTestId('icon-star').closest('button');
        expect(starButton?.className).toContain('text-yellow-500');
    });

    it('has a clickable Map tab trigger', () => {
        render(<LoadDetailView {...defaultProps} />);
        // Radix Tabs only mounts active tab content; verify the Map tab trigger exists
        const mapTab = screen.getByText('Map');
        expect(mapTab).toBeTruthy();
        // Should be clickable without error
        fireEvent.click(mapTab);
    });
});
