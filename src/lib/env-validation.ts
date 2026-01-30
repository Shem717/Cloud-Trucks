import { serverEnvSchema, publicEnvSchema } from './env.schema';
import { z } from 'zod';

let validated = false;

export function validateEnv() {
  if (validated) return;

  try {
    // Server-side validation
    if (typeof window === 'undefined') {
      serverEnvSchema.parse(process.env);
      console.log('✓ Server environment variables validated');
    } else {
      // Client-side validation (only public vars)
      publicEnvSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
      });
      console.log('✓ Client environment variables validated');
    }

    validated = true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      console.error(error.errors);
      throw new Error(
        `Environment validation failed:\n${error.errors
          .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
          .join('\n')}`
      );
    }
    throw error;
  }
}

// Auto-validate on import (server-side only)
if (typeof window === 'undefined') {
  validateEnv();
}
