export interface PuzzleDifficulty {
  name: string;
  rows: number;
  cols: number;
  pieceCount: number;
}

export const PUZZLE_DIFFICULTIES: Record<string, PuzzleDifficulty> = {
  easy: {
    name: 'Easy',
    rows: 3,
    cols: 2,
    pieceCount: 6
  },
  medium: {
    name: 'Medium',
    rows: 6,
    cols: 4,
    pieceCount: 24
  },
  hard: {
    name: 'Hard',
    rows: 8,
    cols: 6,
    pieceCount: 48
  }
};

// For landscape orientation, swap rows and cols
export function getDifficultyForOrientation(
  difficulty: string,
  isPortrait: boolean
): PuzzleDifficulty {
  const base = PUZZLE_DIFFICULTIES[difficulty];
  if (!base) {
    return PUZZLE_DIFFICULTIES.medium;
  }
  
  if (isPortrait) {
    return base;
  } else {
    // Landscape: swap rows and cols
    return {
      name: base.name,
      rows: base.cols,
      cols: base.rows,
      pieceCount: base.pieceCount
    };
  }
}

export const PUZZLE_CONSTANTS = {
  PRECISION: 15,
  SCORE_BASE: 10000,
  SCORE_TIME_MULTIPLIER: 10,
  MIN_SCORE: 0,
  SCORE_BASE_BY_DIFFICULTY: {
    easy: 3000,
    medium: 6000,
    hard: 10000
  }
};

