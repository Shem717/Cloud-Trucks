import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.ENCRYPTION_KEY;

if (!CSRF_SECRET) {
  console.warn('Warning: No CSRF_SECRET found, using fallback. Set CSRF_SECRET in production.');
}

export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });

  return token;
}

export async function validateCSRFToken(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (!storedToken || !token) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(storedToken),
    Buffer.from(token)
  );
}

export async function requireCSRFToken(request: Request): Promise<boolean> {
  const token = request.headers.get('x-csrf-token');

  if (!token) {
    return false;
  }

  return validateCSRFToken(token);
}
