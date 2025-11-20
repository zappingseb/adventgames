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

