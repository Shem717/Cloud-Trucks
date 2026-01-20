# Base image
FROM node:20-slim AS base

# Install necessary dependencies for Puppeteer/Chromium if needed
# We install these in the base image so they are available if the app spawns a browser
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Point Puppeteer to the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Dependencies Image
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Builder Image
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app 
# Note: misuse of standalone output is common for pure worker nodes, 
# but if this is just a worker script, we might just need 'tsc' compilation.
# Assuming Next.js build process handles environment:
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner Image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
CMD ["node", "server.js"]
