# Advent Games

A collection of mobile-first web games built with React, TypeScript, and Vite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. For development (with live compilation):
```bash
npm run start:dev
```
This starts both the Vite dev server (port 5173) and the Express backend (port 3000).

3. For production:
```bash
npm run build
npm start
```

## Development

- Frontend runs on `http://localhost:5173` (Vite dev server with hot reload)
- Backend API runs on `http://localhost:3000`
- Vite proxies `/api` requests to the backend

## Games

### Snowflake Tapper
- Tap snowflakes before they hit the ground
- Speed increases every 15 flakes
- Game over when 5 flakes reach the ground

## Tech Stack

- React 18
- TypeScript
- Vite (build tool with HMR)
- Express (backend API)
- File-based storage (scores.json)

## Deployment

See the [Deployment Guide](./DEPLOYMENT.md) for instructions on deploying to:
- **Google Cloud Run** (Recommended) - Serverless with automatic scaling
- **Docker Compose + SWAG** - Self-hosted with Let's Encrypt

**Important:** For Cloud Run deployment, see [CONFIGURATION.md](./CONFIGURATION.md) for:
- Setting up Cloud Storage for persistent scores
- Configuring games via GitHub Secrets
- Managing game activation via Cloud Run environment variables

The repository includes:
- Optimized Dockerfile for small image size
- GitHub Actions workflow for CI/CD to Cloud Run
- Comprehensive deployment documentation
- Cloud Storage integration for persistent scores

