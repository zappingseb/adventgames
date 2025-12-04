# Multi-stage build for Advent Games - Optimized for size

# Stage 1: Build the React app
FROM node:20-alpine AS builder

WORKDIR /app

# Accept API key as build argument
# Note: This is necessary for embedding the API key in the frontend bundle at build time.
# The key is embedded in the JavaScript bundle and is not a runtime secret.
# hadolint ignore=DL3009
ARG VITE_API_KEY
# hadolint ignore=DL3009
ENV VITE_API_KEY=$VITE_API_KEY

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install all dependencies (including dev dependencies for build)
# Use --no-audit and --no-fund to reduce output and speed up
RUN npm ci --no-audit --no-fund

# Copy source files
COPY src ./src
COPY index.html ./
COPY public ./public
COPY server.js ./

# Build the React app (VITE_API_KEY will be available during build)
RUN npm run build

# Stage 2: Production runtime - minimal image
FROM node:20-alpine

# Install dumb-init for proper signal handling in Cloud Run
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies and clean npm cache
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/public ./public

# Copy service account key file (created in GitHub Actions from secret)
COPY gcloud-storage-admin-key.json ./gcloud-storage-admin-key.json

# Copy games.json file (created in GitHub Actions from GAMES_CONFIG secret)
COPY games.json ./games.json

# Note: scores.json is stored in Cloud Storage (persistent across redeployments)

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    chmod 600 /app/gcloud-storage-admin-key.json && \
    chown nodejs:nodejs /app/gcloud-storage-admin-key.json

USER nodejs

# Expose port (Cloud Run uses PORT env var, but we keep this for compatibility)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server.js"]

