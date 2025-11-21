import express from 'express';
import bodyParser from 'body-parser';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// Use data directory in production
// For Cloud Run: use /tmp (writable) or current directory for Docker Compose
const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? (process.env.GCP_PROJECT ? '/tmp' : path.join(__dirname, 'data'))
  : __dirname;
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const isDev = process.env.NODE_ENV !== 'production';

// Middleware
app.use(bodyParser.json());

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

// Initialize scores.json if it doesn't exist
async function initScores() {
  try {
    // Ensure data directory exists in production
    if (process.env.NODE_ENV === 'production') {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    await fs.access(SCORES_FILE);
  } catch {
    await fs.writeFile(SCORES_FILE, JSON.stringify({ snowflake: [], flappybird: [] }, null, 2));
  }
}

// Initialize games.json if it doesn't exist
async function initGames() {
  try {
    // Ensure data directory exists in production
    if (process.env.NODE_ENV === 'production') {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    await fs.access(GAMES_FILE);
  } catch {
    const defaultGames = {
      games: [
        {
          code: "SNOWFLAKE2024",
          name: "snowflake",
          title: "❄️ Snowflake Tapper",
          description: "Tap snowflakes before they hit the ground!",
          path: "/snowflake",
          activated: false
        },
        {
          code: "SNOWFLAKE2024TEST",
          name: "snowflake-test",
          title: "❄️ Snowflake Tapper (Test)",
          description: "Tap snowflakes before they hit the ground!",
          path: "/snowflake",
          activated: false
        }
      ]
    };
    await fs.writeFile(GAMES_FILE, JSON.stringify(defaultGames, null, 2));
  }
}

// Read games
async function readGames() {
  try {
    const data = await fs.readFile(GAMES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { games: [] };
  }
}

// Write games
async function writeGames(games) {
  await fs.writeFile(GAMES_FILE, JSON.stringify(games, null, 2));
}

// Read scores
async function readScores() {
  try {
    const data = await fs.readFile(SCORES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { snowflake: [] };
  }
}

// Write scores
async function writeScores(scores) {
  await fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2));
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
    const gamesData = await readGames();
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
    
    const gamesData = await readGames();
    const game = gamesData.games.find(g => g.code === code);
    
    if (!game) {
      return res.status(404).json({ error: 'Invalid code' });
    }
    
    if (game.activated) {
      return res.json({ success: true, game, message: 'Game already activated' });
    }
    
    game.activated = true;
    await writeGames(gamesData);
    
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
  await initScores();
  await initGames();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(PORT, host, () => {
    console.log(`Server running on http://${host}:${PORT}`);
    if (isDev) {
      console.log('Development mode: Vite dev server should be running on port 5173');
      console.log('Run "npm run start:dev" to start both servers');
    }
  });
}

start();
