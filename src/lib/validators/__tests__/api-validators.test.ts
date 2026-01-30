import {
  weatherQuerySchema,
  bookingCreateSchema,
  searchCriteriaSchema,
} from '../api-validators';
import { validateAndSanitize } from '../common';

describe('API Validator Security Tests', () => {
  describe('weatherQuerySchema', () => {
    it('should accept valid coordinates', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: 34.0522,
        lon: -118.2437,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lat).toBe(34.0522);
        expect(result.data.lon).toBe(-118.2437);
      }
    });

    it('should reject latitude > 90', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: 91,
        lon: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('lat');
      }
    });

    it('should reject latitude < -90', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: -91,
        lon: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject longitude > 180', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: 0,
        lon: 181,
      });

      expect(result.success).toBe(false);
    });

    it('should reject longitude < -180', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: 0,
        lon: -181,
      });

      expect(result.success).toBe(false);
    });

    it('should coerce string numbers to numbers', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: '34.0522',
        lon: '-118.2437',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.lat).toBe('number');
        expect(typeof result.data.lon).toBe('number');
      }
    });

    it('should reject non-numeric strings', () => {
      const result = validateAndSanitize(weatherQuerySchema, {
        lat: 'invalid',
        lon: 0,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('bookingCreateSchema', () => {
    const validBooking = {
      load_id: 'CT-12345',
      origin: 'Los Angeles, CA',
      destination: 'Phoenix, AZ',
      pickup_date: '2026-02-01',
      rate: 1500,
      equipment: 'Dry Van',
      broker: 'Test Broker Inc',
    };

    it('should accept valid booking data', () => {
      const result = validateAndSanitize(bookingCreateSchema, validBooking);

      expect(result.success).toBe(true);
    });

    it('should sanitize long strings', () => {
      const longString = 'A'.repeat(1000);
      const result = validateAndSanitize(bookingCreateSchema, {
        ...validBooking,
        origin: longString,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.origin.length).toBeLessThanOrEqual(500);
      }
    });

    it('should trim whitespace', () => {
      const result = validateAndSanitize(bookingCreateSchema, {
        ...validBooking,
        origin: '  Los Angeles, CA  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.origin).toBe('Los Angeles, CA');
      }
    });

    it('should reject negative rate', () => {
      const result = validateAndSanitize(bookingCreateSchema, {
        ...validBooking,
        rate: -100,
      });

      expect(result.success).toBe(false);
    });

    it('should reject excessively high rate', () => {
      const result = validateAndSanitize(bookingCreateSchema, {
        ...validBooking,
        rate: 2000000,
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const result = validateAndSanitize(bookingCreateSchema, {
        load_id: 'CT-12345',
      });

      expect(result.success).toBe(false);
    });

    it('should handle XSS attempts in strings', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const result = validateAndSanitize(bookingCreateSchema, {
        ...validBooking,
        origin: xssPayload,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // String is sanitized (trimmed and length-limited)
        // XSS prevention happens at render time via React
        expect(result.data.origin).toContain('script');
      }
    });
  });

  describe('searchCriteriaSchema', () => {
    it('should accept valid search criteria', () => {
      const result = validateAndSanitize(searchCriteriaSchema, {
        origin_city: 'Los Angeles',
        origin_state: 'CA',
        dest_city: 'Phoenix',
        destination_state: 'AZ',
        equipment_type: 'Van',
        min_rate: 1000,
        max_deadhead: 100,
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid equipment type', () => {
      const result = validateAndSanitize(searchCriteriaSchema, {
        origin_city: 'Los Angeles',
        dest_city: 'Phoenix',
        equipment_type: 'InvalidType',
      });

      expect(result.success).toBe(false);
    });

    it('should accept valid equipment types', () => {
      const validTypes = ['Van', 'Reefer', 'Flatbed', 'Power Only', 'Any'];

      validTypes.forEach((type) => {
        const result = validateAndSanitize(searchCriteriaSchema, {
          origin_city: 'Los Angeles',
          dest_city: 'Phoenix',
          equipment_type: type,
        });

        expect(result.success).toBe(true);
      });
    });

    it('should reject state codes that are not 2 characters', () => {
      const result = validateAndSanitize(searchCriteriaSchema, {
        origin_city: 'Los Angeles',
        origin_state: 'CAL',
        dest_city: 'Phoenix',
        equipment_type: 'Van',
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative min_rate', () => {
      const result = validateAndSanitize(searchCriteriaSchema, {
        origin_city: 'Los Angeles',
        dest_city: 'Phoenix',
        equipment_type: 'Van',
        min_rate: -100,
      });

      expect(result.success).toBe(false);
    });

    it('should reject excessive max_deadhead', () => {
      const result = validateAndSanitize(searchCriteriaSchema, {
        origin_city: 'Los Angeles',
        dest_city: 'Phoenix',
        equipment_type: 'Van',
        max_deadhead: 5000,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts in strings', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const result = validateAndSanitize(bookingCreateSchema, {
        load_id: sqlInjection,
        origin: 'Los Angeles, CA',
        destination: 'Phoenix, AZ',
        pickup_date: '2026-02-01',
        rate: 1500,
        equipment: 'Dry Van',
        broker: 'Test Broker Inc',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Supabase handles parameterization
        // Validation ensures it's treated as string data
        expect(result.data.load_id).toBe(sqlInjection);
      }
    });
  });
});
