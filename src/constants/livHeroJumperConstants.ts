export const GRAVITY = 0.6;
export const JUMP_STRENGTH = -12;
export const MOVEMENT_SPEED = 5;
export const LIVES_PER_LEVEL = 3;

export interface LevelConfig {
  level: number;
  scrollSpeed: number;
  gapFrequency: number; // Lower = more frequent gaps
  gapWidthRange: { min: number; max: number };
  gapSpacing: number; // Distance between gaps
  levelLength: number; // Vertical distance to complete level
  lives: number;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    scrollSpeed: 4, // Increased from 2 for faster gameplay
    gapFrequency: 2000, // Much less frequent - milliseconds between gap spawns
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 400, // More spacing between gaps
    levelLength: 6000, // Changed from 2000 to 6000 for 600 points (6000/10 = 600)
    lives: 3,
  },
  {
    level: 2,
    scrollSpeed: 6,
    gapFrequency: 1800,
    gapWidthRange: { min: 90, max: 130 },
    gapSpacing: 380,
    levelLength: 6000,
    lives: 3,
  },
  {
    level: 3,
    scrollSpeed: 7,
    gapFrequency: 1600,
    gapWidthRange: { min: 100, max: 140 },
    gapSpacing: 360,
    levelLength: 6000,
    lives: 3,
  },
  {
    level: 4,
    scrollSpeed: 8,
    gapFrequency: 1400,
    gapWidthRange: { min: 110, max: 150 },
    gapSpacing: 340,
    levelLength: 6000,
    lives: 3,
  },
  {
    level: 5,
    scrollSpeed: 8.5,
    gapFrequency: 1200,
    gapWidthRange: { min: 120, max: 160 },
    gapSpacing: 320,
    levelLength: 6000,
    lives: 3,
  },
  {
    level: 6,
    scrollSpeed: 9.5,
    gapFrequency: 1000,
    gapWidthRange: { min: 130, max: 170 },
    gapSpacing: 300,
    levelLength: 4500,
    lives: 3,
  },
  {
    level: 7,
    scrollSpeed: 10,
    gapFrequency: 900,
    gapWidthRange: { min: 140, max: 180 },
    gapSpacing: 280,
    levelLength: 5000,
    lives: 3,
  },
  {
    level: 8,
    scrollSpeed: 11,
    gapFrequency: 800,
    gapWidthRange: { min: 150, max: 190 },
    gapSpacing: 260,
    levelLength: 5500,
    lives: 3,
  },
  {
    level: 9,
    scrollSpeed: 12,
    gapFrequency: 700,
    gapWidthRange: { min: 160, max: 200 },
    gapSpacing: 240,
    levelLength: 6000,
    lives: 3,
  },
  {
    level: 10,
    scrollSpeed: 12,
    gapFrequency: 600,
    gapWidthRange: { min: 170, max: 210 },
    gapSpacing: 220,
    levelLength: 6500,
    lives: 3,
  },
];

export const COLUMN_POSITIONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
};

export const COLUMN_X_POSITIONS = [
  0.2, // Left column (20% from left)
  0.5, // Middle column (50% from left)
  0.8, // Right column (80% from left)
];

export const RUNNER_WIDTH = 120; // Doubled from 60
export const RUNNER_HEIGHT = 80;
export const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
export const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity for swipe

