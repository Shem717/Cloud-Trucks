import crypto from 'crypto';

// Use a consistent IV length for AES-256-CBC
const IV_LENGTH = 16;
// Check for key in env, otherwise warn (or fail in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-insecure-dev-key-32chars!!';

// Ensure key is 32 bytes
if (ENCRYPTION_KEY.length !== 32) {
    console.warn('Warning: ENCRYPTION_KEY is not 32 characters! Encryption may fail or be insecure.');
}

export function encrypt(text: string) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string) {
    const textParts = text.split(':');
    const ivPart = textParts.shift();
    if (!ivPart) throw new Error('Invalid encryption format');
    const iv = Buffer.from(ivPart, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
