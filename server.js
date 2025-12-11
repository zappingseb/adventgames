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
const useCloudStorage = process.env.GCP_PROJECT && !isDev; // For scores and activations
const useCloudStorageForImages = true; // Always try to use Cloud Storage for images if key file exists

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

// Cloud Storage setup
let storage = null;
let scoresBucket = null;
let livImagesBucket = null;
let serviceAccountEmail = null;
let storageForImages = null;
const SCORES_BUCKET_NAME = process.env.SCORES_BUCKET_NAME || 'adventgames-scores';
const LIV_IMAGES_BUCKET_NAME = process.env.LIV_IMAGES_BUCKET_NAME || 'advent-game-runner';
const SCORES_FILE_NAME = 'scores.json';
const GAMES_ACTIVATION_FILE_NAME = 'games-activation.json';

// Initialize Cloud Storage (called during startup)
async function initCloudStorage() {
  let keyFilePath = null;
  
  // For images: always try to use Cloud Storage if key file exists (even in dev)
  // For scores/activations: only in production
  if (!isDev) {
    keyFilePath = '/app/gcloud-storage-admin-key.json';
  } else {
    // In development, check for key file at project root for images
    const localKeyPath = path.join(__dirname, 'gcloud-storage-admin-key.json');
    try {
      await fs.access(localKeyPath);
      keyFilePath = localKeyPath;
      logger.info({ keyFilePath: localKeyPath }, 'Found local Cloud Storage key file for development');
    } catch (fileError) {
      logger.debug({ keyFilePath: localKeyPath }, 'Local Cloud Storage key file not found');
    }
  }
  
  try {
    // Initialize storage for images (always if key file exists)
    if (useCloudStorageForImages) {
      if (keyFilePath) {
        // In production, the key file MUST exist (it's written by GitHub Actions)
        // Fail hard if it doesn't exist rather than falling back to ADC
        await fs.access(keyFilePath);
        let keyFileContents = await fs.readFile(keyFilePath, 'utf8');
        
        // Trim whitespace and newlines that might be added by echo in GitHub Actions
        keyFileContents = keyFileContents.trim();
        
        let keyData;
        try {
          keyData = JSON.parse(keyFileContents);
        } catch (parseError) {
          // Log the first 200 chars to help debug (without exposing the full key)
          const preview = keyFileContents.substring(0, 200);
          logger.error({ 
            keyFilePath,
            parseError: parseError.message,
            filePreview: preview,
            fileLength: keyFileContents.length,
            note: 'Failed to parse key file JSON. Check if the secret is properly formatted.'
          }, 'Failed to parse service account key file');
          throw new Error(`Invalid JSON in key file: ${parseError.message}`);
        }
        
        serviceAccountEmail = keyData.client_email || null;
        
        // Use keyFilename to ensure the private key is used directly
        // This should work the same locally and in Cloud Run
        storageForImages = new Storage({ keyFilename: keyFilePath });
        logger.info({ 
          keyFilePath, 
          serviceAccountEmail,
          hasPrivateKey: !!keyData.private_key,
          note: 'Using service account key file - private key will be used directly for signing'
        }, 'Initialized Cloud Storage for images with service account key');
      } else {
        // No key file path - this shouldn't happen in production
        logger.error('No key file path configured for images storage');
        throw new Error('Key file path not configured for images storage');
      }
      
      if (storageForImages) {
        livImagesBucket = storageForImages.bucket(LIV_IMAGES_BUCKET_NAME);
        // Verify bucket is accessible
        try {
          const [exists] = await livImagesBucket.exists();
          if (exists) {
            logger.info({ bucket: LIV_IMAGES_BUCKET_NAME }, 'Liv images bucket is ready and accessible');
          } else {
            logger.warn({ bucket: LIV_IMAGES_BUCKET_NAME }, 'Liv images bucket does not exist');
            livImagesBucket = null;
          }
        } catch (bucketError) {
          logger.error({ bucket: LIV_IMAGES_BUCKET_NAME, error: bucketError.message }, 'Failed to verify bucket access');
          livImagesBucket = null;
        }
      }
    }
    
    // Initialize storage for scores/activations (only in production)
    if (useCloudStorage) {
      if (keyFilePath) {
        storage = new Storage({ keyFilename: keyFilePath });
        logger.info({ keyFilePath, serviceAccountEmail }, 'Initialized Cloud Storage for scores/activations with service account key');
      } else {
        storage = new Storage();
        logger.info('Initialized Cloud Storage for scores/activations with default credentials');
      }
      scoresBucket = storage.bucket(SCORES_BUCKET_NAME);
    } else {
      logger.info('Using local filesystem for scores and activations (dev mode)');
    }
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to initialize Cloud Storage');
    if (!livImagesBucket && useCloudStorageForImages) {
      logger.warn('Images will not be available');
    }
  }
  
  // Log final state
  if (livImagesBucket) {
    logger.info({ bucket: LIV_IMAGES_BUCKET_NAME }, 'Liv images bucket is ready');
  } else {
    logger.warn({ bucket: LIV_IMAGES_BUCKET_NAME, keyFileExists: !!keyFilePath }, 'Liv images bucket is NOT initialized');
  }
}

// Local filesystem paths (for development or fallback)
const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? (process.env.GCP_PROJECT ? '/tmp' : path.join(__dirname, 'data'))
  : __dirname;
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// API Key configuration
// Read API key from environment variable, or generate a default one for development
const API_KEY = process.env.API_KEY || (isDev ? 'dev-api-key-12345' : null);

if (!API_KEY && !isDev) {
  logger.warn('API_KEY environment variable not set. API endpoints will be unprotected!');
}

// API Key validation middleware
function validateApiKey(req, res, next) {
  // Skip validation in development if no API key is set
  if (isDev && !API_KEY) {
    logger.debug('Skipping API key validation in development (no API key set)');
    return next();
  }
  
  // Since middleware is already scoped to /api routes via app.use('/api', validateApiKey),
  // we don't need to check the path again. All requests here are already /api routes.
  
  const providedKey = req.headers['x-api-key'];
  
  if (!providedKey) {
    logger.warn({ 
      path: req.path, 
      ip: req.ip || req.connection.remoteAddress 
    }, 'API request missing API key');
    return res.status(401).json({ error: 'API key required' });
  }
  
  if (providedKey !== API_KEY) {
    logger.warn({ 
      path: req.path, 
      ip: req.ip || req.connection.remoteAddress 
    }, 'API request with invalid API key');
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
}

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
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Apply API key validation to all API routes
app.use('/api', validateApiKey);

// Serve puzzle HTML (must be before static middleware) - renamed to /puzzle-debugging
app.get('/puzzle-debugging', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/puzzle', 'puzzle.html'));
});

// Serve puzzle static files (for assets like JS, CSS)
app.use('/puzzle', express.static(path.join(__dirname, 'public/puzzle')));

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
        const defaultScores = { snowflake: [], flappybird: [], livherojumper: [] };
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
    await fs.writeFile(SCORES_FILE, JSON.stringify({ snowflake: [], flappybird: [], livherojumper: [] }, null, 2));
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
        return { snowflake: [], flappybird: [], livherojumper: [] };
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
    return { snowflake: [], flappybird: [], livherojumper: [] };
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
      logger.error({ error: error.message, stack: error.stack }, 'Failed to load games.json locally');
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
      logger.error({ error: error.message, stack: error.stack }, 'Failed to load games.json in production');
      games = [];
    }
    
    // Merge with activation states from Cloud Storage
    try {
      const activations = await readGameActivations();
      games = games.map(game => {
        // Use activation from Cloud Storage, default to false if not found
        game.activated = activations[game.code] === true;
        return game;
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to read game activations, using default (false)');
      // Continue with games, all will have activated: false
    }
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
    // Remove code field from response
    const gamesWithoutCode = (gamesData.games || []).map(({ code, ...game }) => game);
    res.json(gamesWithoutCode);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to read games');
    res.status(500).json({ error: 'Failed to read games', details: error.message });
  }
});

// API: Get Liv image signed URL
app.get('/api/images/liv/:level', async (req, res) => {
  try {
    const level = req.params.level;
    // Try .png first, then .jpg as fallback
    const fileNamePng = `level_${level}.png`;
    const fileNameJpg = `level_${level}.jpg`;
    
    if (!livImagesBucket) {
      let keyFileExists = false;
      let keyFilePath = null;
      try {
        keyFilePath = !isDev ? '/app/gcloud-storage-admin-key.json' : path.join(__dirname, 'gcloud-storage-admin-key.json');
        await fs.access(keyFilePath);
        keyFileExists = true;
      } catch (e) {
        keyFileExists = false;
      }
      logger.warn({ 
        bucket: LIV_IMAGES_BUCKET_NAME, 
        storageForImagesExists: !!storageForImages,
        livImagesBucketExists: !!livImagesBucket,
        keyFileExists,
        keyFilePath,
        isDev,
        useCloudStorageForImages
      }, 'Liv images bucket not initialized');
      return res.status(503).json({ error: 'Image storage not available' });
    }
    
    try {
      // Try PNG first
      let file = livImagesBucket.file(fileNamePng);
      let [exists] = await file.exists();
      let fileName = fileNamePng;
      
      // If PNG doesn't exist, try JPG
      if (!exists) {
        file = livImagesBucket.file(fileNameJpg);
        [exists] = await file.exists();
        fileName = fileNameJpg;
      }
      
      if (!exists) {
        logger.warn({ fileName, level, bucket: LIV_IMAGES_BUCKET_NAME }, 'Image file not found in bucket');
        return res.status(404).json({ error: 'Image not found' });
      }
      
      // Try to generate signed URL
      // If this fails due to permissions, we'll serve the image directly
      try {
        // Log which authentication method is being used
        logger.debug({ 
          serviceAccount: serviceAccountEmail,
          usingKeyFile: !!storageForImages?.authClient?.keyFilename,
          isDev 
        }, 'Attempting to generate signed URL');
        
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 3600000, // 1 hour
        });
        
        logger.info({ fileName, level, bucket: LIV_IMAGES_BUCKET_NAME }, 'Generated signed URL for Liv image');
        return res.json({ url });
      } catch (signError) {
        // If signed URL generation fails (e.g., missing iam.serviceAccounts.signBlob permission),
        // return a data URL (base64 encoded image) that the frontend can use directly
        if (signError.message && signError.message.includes('signBlob')) {
          logger.warn({ 
            fileName, 
            level, 
            error: signError.message,
            serviceAccount: serviceAccountEmail,
            usingKeyFile: !!storageForImages?.authClient?.keyFilename,
            note: 'Signed URL generation failed, returning base64 data URL instead'
          }, 'Signed URL generation failed, using base64 fallback.');
          
          // Download the file and convert to base64 data URL
          const [fileContents] = await file.download();
          const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const base64 = fileContents.toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;
          
          return res.json({ url: dataUrl });
        }
        // Re-throw if it's a different error
        throw signError;
      }
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        fileName: fileNamePng,
        level,
        bucket: LIV_IMAGES_BUCKET_NAME 
      }, 'Failed to generate signed URL for Liv image');
      res.status(500).json({ error: 'Failed to generate image URL', details: error.message });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process image request');
    res.status(500).json({ error: 'Failed to process request' });
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

// API: Get list of available puzzles
app.get('/api/puzzles', async (req, res) => {
  try {
    if (!livImagesBucket) {
      return res.status(503).json({ error: 'Image storage not available' });
    }
    
    // List all puzzle directories in the puzzles/ folder
    const [files] = await livImagesBucket.getFiles({ prefix: 'puzzles/' });
    const puzzleIds = new Set();
    
    files.forEach(file => {
      const match = file.name.match(/^puzzles\/([^/]+)\//);
      if (match) {
        puzzleIds.add(match[1]);
      }
    });
    
    const puzzles = [];
    for (const puzzleId of puzzleIds) {
      try {
        // Try to read metadata.json
        const metadataFile = livImagesBucket.file(`puzzles/${puzzleId}/metadata.json`);
        const [exists] = await metadataFile.exists();
        
        if (exists) {
          const [contents] = await metadataFile.download();
          const metadata = JSON.parse(contents.toString());
          puzzles.push({
            id: puzzleId,
            ...metadata
          });
        } else {
          // If no metadata, just include the puzzle ID
          puzzles.push({
            id: puzzleId,
            title: puzzleId,
            description: ''
          });
        }
      } catch (error) {
        logger.warn({ puzzleId, error: error.message }, 'Failed to read puzzle metadata');
        puzzles.push({
          id: puzzleId,
          title: puzzleId,
          description: ''
        });
      }
    }
    
    res.json({ puzzles });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to list puzzles');
    res.status(500).json({ error: 'Failed to list puzzles', details: error.message });
  }
});

// API: Get puzzle preview image
app.get('/api/puzzles/:puzzleId/preview', async (req, res) => {
  try {
    const puzzleId = req.params.puzzleId;
    const fileNameJpg = `puzzles/${puzzleId}/preview.jpg`;
    const fileNamePng = `puzzles/${puzzleId}/preview.png`;
    
    if (!livImagesBucket) {
      return res.status(503).json({ error: 'Image storage not available' });
    }
    
    try {
      // Try JPG first (compressed images are typically .jpg)
      let file = livImagesBucket.file(fileNameJpg);
      let [exists] = await file.exists();
      let fileName = fileNameJpg;
      
      // If JPG doesn't exist, try PNG
      if (!exists) {
        file = livImagesBucket.file(fileNamePng);
        [exists] = await file.exists();
        fileName = fileNamePng;
      }
      
      if (!exists) {
        logger.warn({ fileName, puzzleId, bucket: LIV_IMAGES_BUCKET_NAME }, 'Puzzle preview image not found');
        return res.status(404).json({ error: 'Preview image not found' });
      }
      
      // For puzzle images, always use base64 to avoid CORS issues
      // Images are already compressed to max 500KB, so this is feasible
      try {
        logger.info({ fileName, puzzleId, bucket: LIV_IMAGES_BUCKET_NAME }, 'Loading puzzle preview as base64 (CORS-safe)');
        
        const [fileContents] = await file.download();
        const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const base64 = fileContents.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        return res.json({ url: dataUrl });
      } catch (downloadError) {
        logger.error({ 
          fileName, 
          puzzleId, 
          error: downloadError.message 
        }, 'Failed to download puzzle preview');
        throw downloadError;
      }
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        fileName: fileNamePng,
        puzzleId,
        bucket: LIV_IMAGES_BUCKET_NAME 
      }, 'Failed to generate signed URL for puzzle preview');
      res.status(500).json({ error: 'Failed to generate image URL', details: error.message });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process puzzle preview request');
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// API: Get puzzle image (full image for on-the-fly splitting)
app.get('/api/puzzles/:puzzleId/image', async (req, res) => {
  try {
    const puzzleId = req.params.puzzleId;
    const fileNameJpg = `puzzles/${puzzleId}/image.jpg`;
    const fileNamePng = `puzzles/${puzzleId}/image.png`;
    
    if (!livImagesBucket) {
      return res.status(503).json({ error: 'Image storage not available' });
    }
    
    try {
      // Try JPG first (compressed images are typically .jpg)
      let file = livImagesBucket.file(fileNameJpg);
      let [exists] = await file.exists();
      let fileName = fileNameJpg;
      
      // If JPG doesn't exist, try PNG
      if (!exists) {
        file = livImagesBucket.file(fileNamePng);
        [exists] = await file.exists();
        fileName = fileNamePng;
      }
      
      if (!exists) {
        logger.warn({ fileName, puzzleId, bucket: LIV_IMAGES_BUCKET_NAME }, 'Puzzle image not found');
        return res.status(404).json({ error: 'Puzzle image not found' });
      }
      
      // For puzzle images, always use base64 to avoid CORS issues
      // Images are already compressed to max 500KB, so this is feasible
      try {
        logger.info({ fileName, puzzleId, bucket: LIV_IMAGES_BUCKET_NAME }, 'Loading puzzle image as base64 (CORS-safe)');
        
        const [fileContents] = await file.download();
        const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const base64 = fileContents.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        return res.json({ url: dataUrl });
      } catch (downloadError) {
        logger.error({ 
          fileName, 
          puzzleId, 
          error: downloadError.message 
        }, 'Failed to download puzzle image');
        throw downloadError;
      }
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        fileName: fileNamePng,
        puzzleId,
        bucket: LIV_IMAGES_BUCKET_NAME 
      }, 'Failed to generate signed URL for puzzle image');
      res.status(500).json({ error: 'Failed to generate image URL', details: error.message });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process puzzle image request');
    res.status(500).json({ error: 'Failed to process request' });
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
      if (livImagesBucket) {
        logger.info({ bucket: LIV_IMAGES_BUCKET_NAME }, '✓ Using Cloud Storage for Liv images');
      } else {
        logger.warn({ bucket: LIV_IMAGES_BUCKET_NAME }, '✗ Cloud Storage NOT available for Liv images');
      }
    } else {
      logger.info('=== PRODUCTION MODE ===');
      if (useCloudStorage) {
        logger.info({ bucket: SCORES_BUCKET_NAME }, 'Using Cloud Storage bucket for scores');
      } else {
        logger.info('Using local filesystem for scores');
      }
      if (livImagesBucket) {
        logger.info({ bucket: LIV_IMAGES_BUCKET_NAME }, 'Using Cloud Storage for Liv images');
      }
      logger.info('Games loaded from games.json (Docker image) with activations from Cloud Storage');
    }
  });
}

start();
