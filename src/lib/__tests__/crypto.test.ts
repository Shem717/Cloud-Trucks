import { encryptCredentials, decryptCredentials, decrypt } from '../crypto';

describe('Encryption Security Tests', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-must-be-32-characters-long';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encryptCredentials', () => {
    it('should encrypt email and password', async () => {
      const result = await encryptCredentials('test@example.com', 'password123');

      expect(result.encryptedEmail).toBeDefined();
      expect(result.encryptedPassword).toBeDefined();
      expect(result.encryptedEmail).not.toContain('test@example.com');
      expect(result.encryptedPassword).not.toContain('password123');
    });

    it('should produce different ciphertext for same input (salt randomization)', async () => {
      const result1 = await encryptCredentials('test@example.com', 'password123');
      const result2 = await encryptCredentials('test@example.com', 'password123');

      expect(result1.encryptedEmail).not.toEqual(result2.encryptedEmail);
      expect(result1.encryptedPassword).not.toEqual(result2.encryptedPassword);
    });

    it('should fail without ENCRYPTION_KEY', async () => {
      delete process.env.ENCRYPTION_KEY;

      await expect(encryptCredentials('test@example.com', 'password123'))
        .rejects.toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('decryptCredentials', () => {
    it('should decrypt credentials correctly', async () => {
      const encrypted = await encryptCredentials('test@example.com', 'password123');
      const decrypted = await decryptCredentials(
        encrypted.encryptedEmail,
        encrypted.encryptedPassword
      );

      expect(decrypted.email).toBe('test@example.com');
      expect(decrypted.password).toBe('password123');
    });

    it('should fail with wrong encryption key', async () => {
      const encrypted = await encryptCredentials('test@example.com', 'password123');

      process.env.ENCRYPTION_KEY = 'different-key-must-be-32-characters-long';

      await expect(decryptCredentials(encrypted.encryptedEmail, encrypted.encryptedPassword))
        .rejects.toThrow('Failed to decrypt credentials');
    });

    it('should fail with tampered ciphertext', async () => {
      const encrypted = await encryptCredentials('test@example.com', 'password123');
      const tampered = encrypted.encryptedEmail.substring(0, encrypted.encryptedEmail.length - 4) + 'xxxx';

      await expect(decryptCredentials(tampered, encrypted.encryptedPassword))
        .rejects.toThrow();
    });

    it('should fail with invalid format (missing parts)', async () => {
      await expect(decrypt('invalid:format'))
        .rejects.toThrow('Invalid encrypted data format');
    });
  });

  describe('Security Properties', () => {
    it('should use authentication tag for integrity', async () => {
      const encrypted = await encryptCredentials('test@example.com', 'password123');

      // Encrypted format: salt:iv:authTag:encrypted
      const parts = encrypted.encryptedEmail.split(':');
      expect(parts.length).toBe(4);
      expect(parts[2]).toHaveLength(32); // Auth tag should be 16 bytes = 32 hex chars
    });

    it('should use unique IV for each encryption', async () => {
      const result1 = await encryptCredentials('test@example.com', 'password123');
      const result2 = await encryptCredentials('test@example.com', 'password123');

      const iv1 = result1.encryptedEmail.split(':')[1];
      const iv2 = result2.encryptedEmail.split(':')[1];

      expect(iv1).not.toEqual(iv2);
    });

    it('should use unique salt for each encryption', async () => {
      const result1 = await encryptCredentials('test@example.com', 'password123');
      const result2 = await encryptCredentials('test@example.com', 'password123');

      const salt1 = result1.encryptedEmail.split(':')[0];
      const salt2 = result2.encryptedEmail.split(':')[0];

      expect(salt1).not.toEqual(salt2);
    });
  });
});
