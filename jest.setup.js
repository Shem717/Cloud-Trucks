import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-' + 'x'.repeat(100)
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key-' + 'x'.repeat(100)
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-min'
process.env.CRON_SECRET = 'test-cron-secret-32-chars-minimum'
process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN = 'pk.test-mapbox-token'
process.env.NODE_ENV = 'test'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return '/test-path'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

// Mock env-validation to prevent auto-validate on import
jest.mock('@/lib/env-validation', () => ({
  validateEnv: jest.fn(),
}))
