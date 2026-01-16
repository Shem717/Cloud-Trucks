import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives a key from the encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts a string using AES-256-GCM
 */
function encrypt(text: string): string {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(process.env.ENCRYPTION_KEY, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: salt:iv:authTag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with AES-256-GCM
 * @internal Use decryptCredentials for credential decryption
 */
export function decrypt(encryptedData: string): string {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, authTagHex, encrypted] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const key = deriveKey(process.env.ENCRYPTION_KEY, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encrypts CloudTrucks credentials
 */
export async function encryptCredentials(
    email: string,
    password: string
): Promise<{
    encryptedEmail: string;
    encryptedPassword: string;
}> {
    try {
        return {
            encryptedEmail: encrypt(email),
            encryptedPassword: encrypt(password),
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt credentials');
    }
}

/**
 * Decrypts CloudTrucks credentials
 */
export async function decryptCredentials(
    encryptedEmail: string,
    encryptedPassword: string
): Promise<{
    email: string;
    password: string;
}> {
    try {
        return {
            email: decrypt(encryptedEmail),
            password: decrypt(encryptedPassword),
        };
    } catch (error: any) {
        console.error('Decryption error:', error);
        // Expose the actual crypto error for debugging
        throw new Error(`Failed to decrypt credentials: ${error.message}`);
    }
}
