import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';

export async function GET() {
  const token = await generateCSRFToken();

  return NextResponse.json({ csrfToken: token });
}
