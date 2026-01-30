import { z } from 'zod';

// Server-only environment variables
export const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(100),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(100),
  ENCRYPTION_KEY: z.string().min(32),
  CRON_SECRET: z.string().min(32).optional(),
  FIGMA_PAT: z.string().optional(),
  FIGMA_FILE_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().startsWith('pk.'),
  VERCEL_OIDC_TOKEN: z.string().optional(),
  CLOUDTRUCKS_DEBUG: z.enum(['0', '1']).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Public environment variables (safe for client)
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
