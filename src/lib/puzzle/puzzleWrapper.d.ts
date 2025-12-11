/**
 * Type declarations for puzzleWrapper.js
 */

export function loadPuzzleScript(): Promise<void>;
export function initPuzzleGame(
  containerId: string,
  imageUrl: string,
  rows: number,
  cols: number,
  onComplete: (finalScore: number) => void
): void;
export function cleanupPuzzleGame(): void;

