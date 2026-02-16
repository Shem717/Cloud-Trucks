import type { NextConfig } from "next";
import { validateEnv } from './src/lib/env-validation';

// Validate environment on build (skip in test - env vars set via jest.setup.js)
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

const nextConfig: NextConfig = {
  // Simplify for debugging
};

export default nextConfig;

