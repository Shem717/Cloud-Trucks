import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadDataTable, columns } from '../load-data-table';

// Mock the DataTable component
jest.mock('@/components/ui/data-table', () => ({
    DataTable: ({ columns: cols, data, onRowClick, selectedRowId, getRowId }: any) => (
        <table data-testid="data-table">
            <thead>
                <tr>
                    {cols.map((col: any, i: number) => (
                        <th key={i}>{typeof col.header === 'string' ? col.header : col.accessorKey || col.id}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row: any, i: number) => {
                    const rowId = getRowId ? getRowId(row) : i;
                    return (
                        <tr
                            key={rowId}
                            data-testid={`row-${i}`}
                            data-selected={rowId === selectedRowId}
                            onClick={() => onRowClick?.(row)}
                        >
                            <td>{row.status || 'new'}</td>
                            <td>{row.rate}</td>
                            <td>{row.origin_city}, {row.origin_state}</td>
                            <td>{row.dest_city}, {row.dest_state}</td>
                            <td>{row.distance}mi</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    ),
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
    ArrowUpDown: () => <span>↕</span>,
    MapPin: () => <span>📍</span>,
    Calendar: () => <span>📅</span>,
    DollarSign: () => <span>$</span>,
    Truck: () => <span>🚛</span>,
    MoreHorizontal: () => <span>⋯</span>,
    Map: () => <span>🗺</span>,
}));

const MOCK_LOAD_DATA = [
    {
        id: 'load-001',
        status: 'new',
        rate: 2500,
        origin_city: 'Los Angeles',
        origin_state: 'CA',
        dest_city: 'Phoenix',
        dest_state: 'AZ',
        distance: 370,
        pickup_date: '2026-02-20T08:00:00Z',
        delivery_date: '2026-02-21T14:00:00Z',
        equipment: ['Van'],
        weight: 42000,
        origin_deadhead_mi: 15,
        dest_deadhead_mi: 20,
    },
    {
        id: 'load-002',
        status: 'viewed',
        rate: 3200,
        origin_city: 'Chicago',
        origin_state: 'IL',
        dest_city: 'Detroit',
        dest_state: 'MI',
        distance: 280,
        pickup_date: '2026-02-22T10:00:00Z',
        delivery_date: '2026-02-23T16:00:00Z',
        equipment: ['Reefer'],
        weight: 38000,
        origin_deadhead_mi: 8,
        dest_deadhead_mi: 12,
    },
];

describe('LoadDataTable', () => {
    it('renders the data table', () => {
        render(<LoadDataTable data={MOCK_LOAD_DATA} />);
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('renders all rows', () => {
        render(<LoadDataTable data={MOCK_LOAD_DATA} />);
        expect(screen.getByTestId('row-0')).toBeInTheDocument();
        expect(screen.getByTestId('row-1')).toBeInTheDocument();
    });

    it('displays load data in rows', () => {
        render(<LoadDataTable data={MOCK_LOAD_DATA} />);
        expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
        expect(screen.getByText('Chicago, IL')).toBeInTheDocument();
    });

    it('calls onRowClick when a row is clicked', () => {
        const handleClick = jest.fn();
        render(<LoadDataTable data={MOCK_LOAD_DATA} onRowClick={handleClick} />);

        fireEvent.click(screen.getByTestId('row-0'));
        expect(handleClick).toHaveBeenCalledWith(MOCK_LOAD_DATA[0]);
    });

    it('renders empty table with no data', () => {
        render(<LoadDataTable data={[]} />);
        expect(screen.getByTestId('data-table')).toBeInTheDocument();
        expect(screen.queryByTestId('row-0')).not.toBeInTheDocument();
    });

    it('passes selectedId to DataTable', () => {
        render(
            <LoadDataTable
                data={MOCK_LOAD_DATA}
                selectedId="load-001"
            />
        );
        const row = screen.getByTestId('row-0');
        expect(row.getAttribute('data-selected')).toBe('true');
    });
});

describe('columns definition', () => {
    it('has the expected number of columns', () => {
        // status, rate, origin, destination, trip, dates, equipment, weight, actions
        expect(columns.length).toBe(9);
    });

    it('includes required accessor keys', () => {
        const accessorKeys = columns
            .map((col: any) => col.accessorKey || col.id)
            .filter(Boolean);

        expect(accessorKeys).toContain('status');
        expect(accessorKeys).toContain('rate');
        expect(accessorKeys).toContain('origin');
        expect(accessorKeys).toContain('destination');
        expect(accessorKeys).toContain('distance');
        expect(accessorKeys).toContain('dates');
        expect(accessorKeys).toContain('equipment');
        expect(accessorKeys).toContain('weight');
        expect(accessorKeys).toContain('actions');
    });
});
