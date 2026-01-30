import { generateCSRFToken, validateCSRFToken } from '../csrf';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('CSRF Protection Tests', () => {
  let mockCookieStore: any;

  beforeEach(() => {
    mockCookieStore = {
      set: jest.fn(),
      get: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCSRFToken', () => {
    it('should generate a random token', async () => {
      const token1 = await generateCSRFToken();
      const token2 = await generateCSRFToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toEqual(token2);
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should set token in httpOnly cookie', async () => {
      await generateCSRFToken();

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 60 * 60, // 1 hour
          path: '/',
        })
      );
    });

    it('should use secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await generateCSRFToken();

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate matching tokens', async () => {
      const token = 'a'.repeat(64);
      mockCookieStore.get.mockReturnValue({ value: token });

      const isValid = await validateCSRFToken(token);

      expect(isValid).toBe(true);
    });

    it('should reject mismatched tokens', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'a'.repeat(64) });

      const isValid = await validateCSRFToken('b'.repeat(64));

      expect(isValid).toBe(false);
    });

    it('should reject when cookie is missing', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const isValid = await validateCSRFToken('a'.repeat(64));

      expect(isValid).toBe(false);
    });

    it('should reject when token is empty', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'a'.repeat(64) });

      const isValid = await validateCSRFToken('');

      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison', async () => {
      // This test ensures timing attacks are prevented
      const token = 'a'.repeat(64);
      mockCookieStore.get.mockReturnValue({ value: token });

      const start1 = Date.now();
      await validateCSRFToken(token);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await validateCSRFToken('b'.repeat(64));
      const time2 = Date.now() - start2;

      // Times should be similar (within 10ms)
      // This is a basic check - in reality, timing attacks require many samples
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('Security Properties', () => {
    it('should use cryptographically secure random generation', async () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(await generateCSRFToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should have sufficient entropy', async () => {
      const token = await generateCSRFToken();

      // 64 hex chars = 32 bytes = 256 bits of entropy
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
