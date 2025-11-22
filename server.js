import express from 'express';
import bodyParser from 'body-parser';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';
const useCloudStorage = process.env.GCP_PROJECT && !isDev;

// Initialize logger
// In production (Cloud Run), use JSON format for Cloud Logging
// In development, use pretty printing
const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  } : {})
});

// Cloud Storage setup (only in production with GCP_PROJECT)
let storage = null;
let scoresBucket = null;
const SCORES_BUCKET_NAME = process.env.SCORES_BUCKET_NAME || 'adventgames-scores';
const SCORES_FILE_NAME = 'scores.json';

// Initialize Cloud Storage (called during startup)
async function initCloudStorage() {
  if (!useCloudStorage) {
    return;
  }
  
  try {
    // Read service account key from file (copied into Docker image during build)
    const keyFilePath = '/app/gcloud-storage-admin-key.json';
    
    try {
      // Verify the file exists
      await fs.access(keyFilePath);
      // Use keyFilename option - Storage client will read and parse the JSON file
      storage = new Storage({ keyFilename: keyFilePath });
      logger.info({ keyFilePath }, 'Initialized Cloud Storage with service account key');
    } catch (fileError) {
      // If file doesn't exist, use default credentials
      logger.warn({ keyFilePath, error: fileError.message }, 'Service account key file not found, using default credentials');
      storage = new Storage();
      logger.info('Initialized Cloud Storage with default credentials');
    }
    scoresBucket = storage.bucket(SCORES_BUCKET_NAME);
  } catch (error) {
    logger.warn({ error: error.message }, 'Failed to initialize Cloud Storage, falling back to local filesystem');
  }
}

// Local filesystem paths (for development or fallback)
const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? (process.env.GCP_PROJECT ? '/tmp' : path.join(__dirname, 'data'))
  : __dirname;
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// Middleware
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress
    }, 'HTTP request');
  });
  next();
});

// CORS headers for development
if (isDev) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Serve static files in production
if (!isDev) {
  app.use(express.static('dist'));
}

// ===== SCORES MANAGEMENT (Cloud Storage or Local) =====

// Initialize scores.json
async function initScores() {
  if (useCloudStorage && scoresBucket) {
    try {
      // Ensure bucket exists
      const [bucketExists] = await scoresBucket.exists();
      if (!bucketExists) {
        logger.warn({ bucket: SCORES_BUCKET_NAME }, 'Cloud Storage bucket does not exist, falling back to local filesystem');
        await initScoresLocal();
        return;
      }
      
      const file = scoresBucket.file(SCORES_FILE_NAME);
      const [exists] = await file.exists();
      if (!exists) {
        const defaultScores = { snowflake: [], flappybird: [] };
        await file.save(JSON.stringify(defaultScores, null, 2), {
          contentType: 'application/json',
        });
        logger.info('Initialized scores.json in Cloud Storage');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to initialize scores in Cloud Storage, falling back to local filesystem');
      // Fallback to local
      await initScoresLocal();
    }
  } else {
    await initScoresLocal();
  }
}

async function initScoresLocal() {
  try {
    if (process.env.NODE_ENV === 'production') {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    await fs.access(SCORES_FILE);
  } catch {
    await fs.writeFile(SCORES_FILE, JSON.stringify({ snowflake: [], flappybird: [] }, null, 2));
  }
}

// Read scores
async function readScores() {
  if (useCloudStorage && scoresBucket) {
    try {
      const [bucketExists] = await scoresBucket.exists();
      if (!bucketExists) {
        return readScoresLocal();
      }
      
      const file = scoresBucket.file(SCORES_FILE_NAME);
      const [exists] = await file.exists();
      if (!exists) {
        return { snowflake: [], flappybird: [] };
      }
      const [contents] = await file.download();
      return JSON.parse(contents.toString());
    } catch (error) {
      logger.error({ error }, 'Failed to read scores from Cloud Storage, falling back to local');
      return readScoresLocal();
    }
  }
  return readScoresLocal();
}

async function readScoresLocal() {
  try {
    const data = await fs.readFile(SCORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { snowflake: [], flappybird: [] };
  }
}

// Write scores
async function writeScores(scores) {
  if (useCloudStorage && scoresBucket) {
    try {
      const [bucketExists] = await scoresBucket.exists();
      if (!bucketExists) {
        logger.warn({ bucket: SCORES_BUCKET_NAME }, 'Cloud Storage bucket does not exist, using local filesystem');
        await writeScoresLocal(scores);
        return;
      }
      
      const file = scoresBucket.file(SCORES_FILE_NAME);
      await file.save(JSON.stringify(scores, null, 2), {
        contentType: 'application/json',
      });
      return;
    } catch (error) {
      logger.error({ error }, 'Failed to write scores to Cloud Storage, falling back to local');
      // Fallback to local
    }
  }
  await writeScoresLocal(scores);
}

async function writeScoresLocal(scores) {
  try {
    if (process.env.NODE_ENV === 'production') {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    await fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2));
  } catch (error) {
    logger.error({ error }, 'Failed to write scores locally');
    throw error;
  }
}

// ===== GAMES MANAGEMENT (GitHub Secrets + Cloud Run Env Vars) =====

// Load games from GAMES_CONFIG env var (from GitHub Secrets) and merge with activated states
async function loadGames() {
  let games = [];
  
  // In development mode, prioritize local games.json file
  if (isDev) {
    try {
      const gamesFile = path.join(__dirname, 'games.json');
      const data = await fs.readFile(gamesFile, 'utf8');
      const gamesData = JSON.parse(data);
      games = gamesData.games || [];
      logger.debug('Loaded games from local games.json (dev mode)');
    } catch (error) {
      logger.warn({ error: error.message }, 'No games.json found locally, trying GAMES_CONFIG env var');
      // Fallback to GAMES_CONFIG if local file doesn't exist
      if (process.env.GAMES_CONFIG) {
        try {
          const gamesConfig = JSON.parse(process.env.GAMES_CONFIG);
          games = gamesConfig.games || [];
        } catch (parseError) {
          logger.error({ error: parseError }, 'Failed to parse GAMES_CONFIG');
        }
      }
    }
  } else {
    // In production, prioritize GAMES_CONFIG env var (from GitHub Secrets)
    if (process.env.GAMES_CONFIG) {
      try {
        const gamesConfig = JSON.parse(process.env.GAMES_CONFIG);
        games = gamesConfig.games || [];
      } catch (error) {
        logger.error({ error }, 'Failed to parse GAMES_CONFIG');
      }
    }
    
    // Fallback to local file if GAMES_CONFIG is not set (for backward compatibility)
    if (games.length === 0) {
      try {
        const gamesFile = path.join(__dirname, 'games.json');
        const data = await fs.readFile(gamesFile, 'utf8');
        const gamesData = JSON.parse(data);
        games = gamesData.games || [];
      } catch (error) {
        logger.warn('No games.json found locally, using empty array');
        games = [];
      }
    }
    
    // In production, strip any activated fields from games.json
    // Activation is controlled only via Cloud Run environment variables
    games = games.map(game => {
      const { activated, ...gameWithoutActivated } = game;
      return gameWithoutActivated;
    });
  }
  
  // Merge activated states from environment variables
  // Format: GAME_<CODE>_ACTIVATED=true/false
  // Example: GAME_FLAPPYBIRD2024_ACTIVATED=true
  // In dev mode: env vars override the activated field from games.json
  // In production: env vars are the source of truth
  games = games.map(game => {
    const envVarName = `GAME_${game.code}_ACTIVATED`;
    const activatedEnv = process.env[envVarName];
    
    if (activatedEnv !== undefined) {
      // Environment variable takes precedence
      game.activated = activatedEnv === 'true' || activatedEnv === '1';
    } else if (isDev) {
      // In dev mode, keep the activated value from games.json if no env var is set
      game.activated = game.activated !== undefined ? game.activated : false;
    } else {
      // In production, default to false if not specified
      game.activated = false;
    }
    
    return game;
  });
  
  return games;
}

// Get games (always read fresh to pick up env var changes)
async function getGames() {
  return { games: await loadGames() };
}

// API: Get scores
app.get('/api/scores/:game', async (req, res) => {
  try {
    const scores = await readScores();
    const game = req.params.game;
    res.json(scores[game] || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read scores' });
  }
});

// API: Submit score
app.post('/api/scores/:game', async (req, res) => {
  try {
    const { username, flakes } = req.body;
    const game = req.params.game;
    
    if (!username || flakes === undefined) {
      return res.status(400).json({ error: 'Username and flakes required' });
    }
    
    const scores = await readScores();
    if (!scores[game]) {
      scores[game] = [];
    }
    
    scores[game].push({
      username,
      flakes,
      timestamp: new Date().toISOString()
    });
    
    // Sort by flakes descending
    scores[game].sort((a, b) => b.flakes - a.flakes);
    
    await writeScores(scores);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// API: Get all games
app.get('/api/games', async (req, res) => {
  try {
    const gamesData = await getGames();
    res.json(gamesData.games || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read games' });
  }
});

// API: Activate game with code
// Note: In production, activation should be done via Cloud Run environment variables
// This endpoint is kept for backward compatibility but won't persist in Cloud Run
app.post('/api/games/activate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const gamesData = await getGames();
    const game = gamesData.games.find(g => g.code === code);
    
    if (!game) {
      return res.status(404).json({ error: 'Invalid code' });
    }
    
    if (game.activated) {
      return res.json({ success: true, game, message: 'Game already activated' });
    }
    
    // In production with Cloud Run, activation is controlled by env vars
    // This endpoint will only work temporarily until the instance restarts
    if (useCloudStorage) {
      return res.json({ 
        success: false, 
        message: 'Activation must be done via Cloud Run environment variables. Set GAME_' + code + '_ACTIVATED=true',
        game 
      });
    }
    
    // For local development, we can still update the file
    game.activated = true;
    const gamesFile = path.join(__dirname, 'games.json');
    try {
      const currentGames = JSON.parse(await fs.readFile(gamesFile, 'utf8'));
      const gameIndex = currentGames.games.findIndex(g => g.code === code);
      if (gameIndex !== -1) {
        currentGames.games[gameIndex].activated = true;
        await fs.writeFile(gamesFile, JSON.stringify(currentGames, null, 2));
      }
    } catch (error) {
      logger.error({ error }, 'Failed to update games.json locally');
    }
    
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate game' });
  }
});

// Serve React app in production
if (!isDev) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
async function start() {
  // Initialize Cloud Storage first (writes key file if needed)
  await initCloudStorage();
  await initScores();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(PORT, host, () => {
    logger.info({ host, port: PORT }, 'Server started');
    if (isDev) {
      logger.info('=== DEVELOPMENT MODE ===');
      logger.info('Vite dev server should be running on port 5173');
      logger.info('Run "npm run start:dev" to start both servers');
      logger.info('Using local files: scores.json and games.json');
    } else {
      logger.info('=== PRODUCTION MODE ===');
      if (useCloudStorage) {
        logger.info({ bucket: SCORES_BUCKET_NAME }, 'Using Cloud Storage bucket for scores');
      } else {
        logger.info('Using local filesystem for scores');
      }
      const gamesSource = process.env.GAMES_CONFIG ? 'GAMES_CONFIG env var (GitHub Secrets)' : 'local games.json (fallback)';
      logger.info({ gamesSource }, 'Games loaded from');
    }
  });
}

start();
