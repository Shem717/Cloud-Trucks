import { z } from 'zod';
import {
    sanitizeString,
    validateAndSanitize,
    coordinateSchema,
    paginationSchema,
    dateSchema,
    uuidSchema,
} from '../common';

describe('Validator Common Utilities', () => {
    // ─── sanitizeString ──────────────────────────────────────────────

    describe('sanitizeString', () => {
        it('returns string unchanged when within max length', () => {
            expect(sanitizeString('hello')).toBe('hello');
        });

        it('truncates string exceeding max length', () => {
            const long = 'x'.repeat(2000);
            const result = sanitizeString(long, 100);
            expect(result.length).toBe(100);
        });

        it('trims whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });

        it('truncates before trimming', () => {
            const input = '   ' + 'x'.repeat(10);
            const result = sanitizeString(input, 5);
            // Slices first 5 chars ('   x') then trims
            expect(result.length).toBeLessThanOrEqual(5);
        });

        it('handles empty string', () => {
            expect(sanitizeString('')).toBe('');
        });

        it('uses default maxLength of 1000', () => {
            const long = 'a'.repeat(1500);
            const result = sanitizeString(long);
            expect(result.length).toBe(1000);
        });
    });

    // ─── validateAndSanitize ─────────────────────────────────────────

    describe('validateAndSanitize', () => {
        const simpleSchema = z.object({
            name: z.string().min(1),
            age: z.number().min(0),
        });

        it('returns success with valid data', () => {
            const result = validateAndSanitize(simpleSchema, { name: 'John', age: 30 });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('John');
                expect(result.data.age).toBe(30);
            }
        });

        it('returns failure with invalid data', () => {
            const result = validateAndSanitize(simpleSchema, { name: '', age: -1 });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeDefined();
                expect(typeof result.error).toBe('string');
            }
        });

        it('includes field paths in error messages', () => {
            const result = validateAndSanitize(simpleSchema, { name: '', age: 30 });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('name');
            }
        });

        it('handles non-Zod errors gracefully', () => {
            const throwingSchema = z.string().transform(() => {
                throw new Error('custom error');
            });
            const result = validateAndSanitize(throwingSchema, 'test');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeDefined();
            }
        });

        it('returns typed data on success', () => {
            const result = validateAndSanitize(simpleSchema, { name: 'Sam', age: 25 });
            expect(result.success).toBe(true);
            if (result.success) {
                // TypeScript type check: data should be { name: string; age: number }
                expect(typeof result.data.name).toBe('string');
                expect(typeof result.data.age).toBe('number');
            }
        });
    });

    // ─── coordinateSchema ────────────────────────────────────────────

    describe('coordinateSchema', () => {
        it('accepts valid coordinates', () => {
            const result = coordinateSchema.safeParse({ lat: 34.05, lon: -118.24 });
            expect(result.success).toBe(true);
        });

        it('rejects latitude > 90', () => {
            const result = coordinateSchema.safeParse({ lat: 91, lon: 0 });
            expect(result.success).toBe(false);
        });

        it('rejects longitude < -180', () => {
            const result = coordinateSchema.safeParse({ lat: 0, lon: -181 });
            expect(result.success).toBe(false);
        });

        it('coerces string numbers', () => {
            const result = coordinateSchema.safeParse({ lat: '34.05', lon: '-118.24' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.lat).toBe(34.05);
            }
        });

        it('accepts boundary values', () => {
            expect(coordinateSchema.safeParse({ lat: 90, lon: 180 }).success).toBe(true);
            expect(coordinateSchema.safeParse({ lat: -90, lon: -180 }).success).toBe(true);
        });
    });

    // ─── paginationSchema ────────────────────────────────────────────

    describe('paginationSchema', () => {
        it('uses defaults when no values provided', () => {
            const result = paginationSchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.limit).toBe(20);
                expect(result.data.offset).toBe(0);
            }
        });

        it('accepts valid pagination', () => {
            const result = paginationSchema.safeParse({ limit: 50, offset: 10 });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.limit).toBe(50);
                expect(result.data.offset).toBe(10);
            }
        });

        it('rejects limit > 100', () => {
            const result = paginationSchema.safeParse({ limit: 101 });
            expect(result.success).toBe(false);
        });

        it('rejects limit < 1', () => {
            const result = paginationSchema.safeParse({ limit: 0 });
            expect(result.success).toBe(false);
        });

        it('rejects negative offset', () => {
            const result = paginationSchema.safeParse({ offset: -1 });
            expect(result.success).toBe(false);
        });

        it('coerces string numbers', () => {
            const result = paginationSchema.safeParse({ limit: '25', offset: '5' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.limit).toBe(25);
            }
        });
    });

    // ─── dateSchema ──────────────────────────────────────────────────

    describe('dateSchema', () => {
        it('accepts YYYY-MM-DD format', () => {
            const result = dateSchema.safeParse('2026-02-15');
            expect(result.success).toBe(true);
        });

        it('accepts ISO datetime format', () => {
            const result = dateSchema.safeParse('2026-02-15T10:30:00.000Z');
            expect(result.success).toBe(true);
        });

        it('rejects invalid date strings', () => {
            const result = dateSchema.safeParse('not-a-date');
            expect(result.success).toBe(false);
        });

        it('rejects partial dates', () => {
            const result = dateSchema.safeParse('2026-02');
            expect(result.success).toBe(false);
        });
    });

    // ─── uuidSchema ─────────────────────────────────────────────────

    describe('uuidSchema', () => {
        it('accepts valid UUID', () => {
            const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
            expect(result.success).toBe(true);
        });

        it('rejects invalid UUID', () => {
            const result = uuidSchema.safeParse('not-a-uuid');
            expect(result.success).toBe(false);
        });

        it('rejects empty string', () => {
            const result = uuidSchema.safeParse('');
            expect(result.success).toBe(false);
        });
    });
});
