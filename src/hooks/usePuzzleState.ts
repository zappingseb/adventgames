import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiHeaders } from '../config/apiConfig';
import { PUZZLE_CONSTANTS } from '../constants/puzzleConstants';

export function usePuzzleState() {
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const scoreTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDifficultyRef = useRef<string | null>(null);
  const currentScoreRef = useRef<number>(0); // Track current score in ref to avoid closure issues

  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    currentScoreRef.current = newScore; // Keep ref in sync
  }, []);

  const startTimer = useCallback(() => {
    setStartTime(Date.now());
  }, []);

  const calculateScore = useCallback((timeSeconds: number): number => {
    const calculatedScore = PUZZLE_CONSTANTS.SCORE_BASE - (timeSeconds * PUZZLE_CONSTANTS.SCORE_TIME_MULTIPLIER);
    return Math.max(calculatedScore, PUZZLE_CONSTANTS.MIN_SCORE);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (scoreTimerRef.current) {
        clearInterval(scoreTimerRef.current);
        scoreTimerRef.current = null;
      }
    };
  }, []);

  const endGame = useCallback(async (completed: boolean, finalScore?: number) => {
    // Stop the score timer FIRST to prevent further score changes
    if (scoreTimerRef.current) {
      clearInterval(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }

    setGameActive(false);
    setGameOver(true);

    if (completed && startTime) {
      const endTime = Date.now();
      const timeSeconds = (endTime - startTime) / 1000;
      setCompletionTime(timeSeconds);
      
      // Use provided finalScore if it's valid (> 0), otherwise use ref (which has latest value)
      // The ref always has the latest score value and avoids closure issues
      const scoreToSubmit = (finalScore !== undefined && finalScore > 0) 
        ? finalScore 
        : currentScoreRef.current;

      // Submit score to backend
      const username = localStorage.getItem('username');
      if (username) {
        try {
          await fetch('/api/scores/puzzle', {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              username,
              flakes: scoreToSubmit,
            }),
          });
        } catch (error) {
          // Score submission failed silently
        }
      }
    }
  }, [startTime]);

  const startGame = useCallback((difficulty?: string) => {
    // Stop any existing timer
    if (scoreTimerRef.current) {
      clearInterval(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }

    // Store difficulty for restart
    if (difficulty) {
      currentDifficultyRef.current = difficulty;
    }

    // Get score base based on difficulty
    const difficultyKey = difficulty || currentDifficultyRef.current || 'medium';
    const scoreBase = PUZZLE_CONSTANTS.SCORE_BASE_BY_DIFFICULTY[difficultyKey as keyof typeof PUZZLE_CONSTANTS.SCORE_BASE_BY_DIFFICULTY] 
      || PUZZLE_CONSTANTS.SCORE_BASE_BY_DIFFICULTY.medium;

    // Reset score to base value for difficulty
    setScore(scoreBase);
    currentScoreRef.current = scoreBase; // Initialize ref
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
    setStartTime(Date.now());
    setCompletionTime(null);

    // Start countdown timer (decrease by 1 every second)
    scoreTimerRef.current = setInterval(() => {
      setScore((prevScore) => {
        const newScore = Math.max(prevScore - 1, PUZZLE_CONSTANTS.MIN_SCORE);
        currentScoreRef.current = newScore; // Keep ref in sync
        return newScore;
      });
    }, 1000);
  }, []);

  const restartGame = useCallback(() => {
    // Stop any existing timer
    if (scoreTimerRef.current) {
      clearInterval(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }

    // Get score base based on stored difficulty
    const difficultyKey = currentDifficultyRef.current || 'medium';
    const scoreBase = PUZZLE_CONSTANTS.SCORE_BASE_BY_DIFFICULTY[difficultyKey as keyof typeof PUZZLE_CONSTANTS.SCORE_BASE_BY_DIFFICULTY] 
      || PUZZLE_CONSTANTS.SCORE_BASE_BY_DIFFICULTY.medium;

    // Reset score to base value for difficulty
    setScore(scoreBase);
    currentScoreRef.current = scoreBase; // Initialize ref
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
    setStartTime(Date.now());
    setCompletionTime(null);

    // Start countdown timer (decrease by 1 every second)
    scoreTimerRef.current = setInterval(() => {
      setScore((prevScore) => {
        const newScore = Math.max(prevScore - 1, PUZZLE_CONSTANTS.MIN_SCORE);
        currentScoreRef.current = newScore; // Keep ref in sync
        return newScore;
      });
    }, 1000);
  }, []);

  // Function to get current score (for use in callbacks to avoid closure issues)
  const getCurrentScore = useCallback(() => {
    return currentScoreRef.current;
  }, []);

  return {
    score,
    gameActive,
    gameOver,
    gameStarted,
    startTime,
    completionTime,
    startGame,
    endGame,
    updateScore,
    restartGame,
    startTimer,
    calculateScore,
    getCurrentScore,
  };
}

