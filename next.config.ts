import type { NextConfig } from "next";
import { validateEnv } from './src/lib/env-validation';

// Validate environment on build
validateEnv();

const nextConfig: NextConfig = {
  // Simplify for debugging
};

export default nextConfig;

