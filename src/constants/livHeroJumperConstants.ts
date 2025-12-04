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
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    scrollSpeed: 4,
    gapFrequency: 1000,
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 200,
    levelLength: 6000,
  },
  {
    level: 2,
    scrollSpeed: 7,
    gapFrequency: 900, // 1000 * 0.9
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 380,
    levelLength: 8000,
  },
  {
    level: 3,
    scrollSpeed: 7,
    gapFrequency: 900,
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 342, // 380 * 0.9
    levelLength: 12000,
  },
  {
    level: 4,
    scrollSpeed: 8,
    gapFrequency: 700, // 900 * 0.9
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 340,
    levelLength: 18000,
  },
  {
    level: 5,
    scrollSpeed: 8.5,
    gapFrequency: 700,
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 288, // 320 * 0.9
    levelLength: 27000, // 18000 * 1.5
  },
  {
    level: 6,
    scrollSpeed: 9.5,
    gapFrequency: 600, // 810 * 0.9
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 300,
    levelLength: 40500, // 27000 * 1.5
  },
  {
    level: 7,
    scrollSpeed: 10,
    gapFrequency: 600,
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 252, // 280 * 0.9
    levelLength: 60750, // 40500 * 1.5
  },
  {
    level: 8,
    scrollSpeed: 11,
    gapFrequency: 450, // 729 * 0.9, rounded
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 260,
    levelLength: 91125, // 60750 * 1.5
  },
  {
    level: 9,
    scrollSpeed: 12,
    gapFrequency: 450,
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 216, // 240 * 0.9
    levelLength: 136688, // 91125 * 1.5, rounded
  },
  {
    level: 10,
    scrollSpeed: 12,
    gapFrequency: 400, // 656 * 0.9, rounded
    gapWidthRange: { min: 80, max: 120 },
    gapSpacing: 220,
    levelLength: 205032, // 136688 * 1.5, rounded
  }
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

