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
let serviceAccountEmail = null;
const SCORES_BUCKET_NAME = process.env.SCORES_BUCKET_NAME || 'adventgames-scores';
const SCORES_FILE_NAME = 'scores.json';
const GAMES_ACTIVATION_FILE_NAME = 'games-activation.json';

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
      // Read the key file to get the service account email
      const keyFileContents = await fs.readFile(keyFilePath, 'utf8');
      const keyData = JSON.parse(keyFileContents);
      serviceAccountEmail = keyData.client_email || null;
      // Use keyFilename option - Storage client will read and parse the JSON file
      storage = new Storage({ keyFilename: keyFilePath });
      logger.info({ keyFilePath, serviceAccountEmail }, 'Initialized Cloud Storage with service account key');
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

// ===== GAMES MANAGEMENT =====

// Read game activations from Cloud Storage
async function readGameActivations() {
  if (!useCloudStorage) {
    return {};
  }
  
  if (!scoresBucket) {
    logger.warn('scoresBucket is not initialized, cannot read game activations');
    return {};
  }
  
  try {
    const [bucketExists] = await scoresBucket.exists();
    if (!bucketExists) {
      logger.debug({ bucket: SCORES_BUCKET_NAME }, 'Bucket does not exist, returning empty activations');
      return {};
    }
    
    const file = scoresBucket.file(GAMES_ACTIVATION_FILE_NAME);
    const [exists] = await file.exists();
    if (!exists) {
      logger.debug('games-activation.json does not exist yet, returning empty activations');
      return {};
    }
    const [contents] = await file.download();
    const activations = JSON.parse(contents.toString());
    logger.debug('Successfully read game activations from Cloud Storage');
    return activations;
  } catch (error) {
    logger.error({ 
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code,
      errorDetails: error.details,
      errorName: error.name,
      bucket: SCORES_BUCKET_NAME,
      fileName: GAMES_ACTIVATION_FILE_NAME,
      serviceAccountEmail: serviceAccountEmail,
      useCloudStorage,
      scoresBucketExists: !!scoresBucket
    }, 'Failed to read game activations from Cloud Storage');
    return {};
  }
}

// Write game activations to Cloud Storage
async function writeGameActivations(activations) {
  if (!useCloudStorage) {
    return;
  }
  
  if (!scoresBucket) {
    logger.warn('scoresBucket is not initialized, cannot write game activations');
    return;
  }
  
  try {
    const [bucketExists] = await scoresBucket.exists();
    if (!bucketExists) {
      logger.warn({ bucket: SCORES_BUCKET_NAME }, 'Cloud Storage bucket does not exist, cannot save activations');
      return;
    }
    
    const file = scoresBucket.file(GAMES_ACTIVATION_FILE_NAME);
    await file.save(JSON.stringify(activations, null, 2), {
      contentType: 'application/json',
    });
    logger.debug('Saved game activations to Cloud Storage');
  } catch (error) {
    logger.error({ 
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code,
      errorDetails: error.details,
      errorName: error.name,
      bucket: SCORES_BUCKET_NAME,
      fileName: GAMES_ACTIVATION_FILE_NAME,
      serviceAccountEmail: serviceAccountEmail
    }, 'Failed to write game activations to Cloud Storage');
  }
}

// Load games from games.json and merge with activation states
async function loadGames() {
  let games = [];
  
  // In development mode, read from local games.json (includes activated field)
  if (isDev) {
    try {
      const gamesFile = path.join(__dirname, 'games.json');
      const data = await fs.readFile(gamesFile, 'utf8');
      const gamesData = JSON.parse(data);
      games = gamesData.games || [];
      logger.debug('Loaded games from local games.json (dev mode)');
    } catch (error) {
      logger.warn({ error: error.message }, 'No games.json found locally');
      games = [];
    }
  } else {
    // In production, read games.json from Dockerfile (no activated field)
    try {
      const gamesFile = path.join(__dirname, 'games.json');
      const data = await fs.readFile(gamesFile, 'utf8');
      const gamesData = JSON.parse(data);
      games = gamesData.games || [];
      logger.debug('Loaded games from games.json (production)');
    } catch (error) {
      logger.warn({ error: error.message }, 'No games.json found in Docker image');
      games = [];
    }
    
    // Merge with activation states from Cloud Storage
    const activations = await readGameActivations();
    games = games.map(game => {
      // Use activation from Cloud Storage, default to false if not found
      game.activated = activations[game.code] === true;
      return game;
    });
  }
  
  return games;
}

// Get games (always read fresh to pick up activation changes)
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
    
    // In production, save activation to Cloud Storage
    if (useCloudStorage) {
      const activations = await readGameActivations();
      activations[code] = true;
      await writeGameActivations(activations);
      game.activated = true;
      return res.json({ success: true, game });
    }
    
    // For local development, update games.json file
    const gamesFile = path.join(__dirname, 'games.json');
    try {
      const currentGames = JSON.parse(await fs.readFile(gamesFile, 'utf8'));
      const gameIndex = currentGames.games.findIndex(g => g.code === code);
      if (gameIndex !== -1) {
        currentGames.games[gameIndex].activated = true;
        await fs.writeFile(gamesFile, JSON.stringify(currentGames, null, 2));
        game.activated = true;
      }
    } catch (error) {
      logger.error({ error }, 'Failed to update games.json locally');
      return res.status(500).json({ error: 'Failed to activate game' });
    }
    
    res.json({ success: true, game });
  } catch (error) {
    logger.error({ error }, 'Failed to activate game');
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
      logger.info('Games loaded from games.json (Docker image) with activations from Cloud Storage');
    }
  });
}

start();
