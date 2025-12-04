import { useState, useCallback } from 'react';
import { getApiHeaders } from '../config/apiConfig';

export function useLivHeroJumperState() {
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);

  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const loseLife = useCallback(() => {
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameActive(false);
        setGameOver(true);
      }
      return newLives;
    });
  }, []);

  const completeLevel = useCallback(() => {
    setLevelCompleted(true);
    setGameActive(false);
  }, []);

  const startNextLevel = useCallback(() => {
    setLevelCompleted(false);
    setCurrentLevel((prev) => {
      const nextLevel = prev + 1;
      if (nextLevel > 10) {
        // All levels completed
        setGameOver(true);
        return prev;
      }
      return nextLevel;
    });
    // Lives persist across levels - don't reset them
    // Score continues - don't reset it
    setGameActive(true);
  }, []);

  const endGame = useCallback(async (finalScore: number) => {
    setGameActive(false);
    setGameOver(true);

    // Submit score to backend
    const username = localStorage.getItem('username');
    if (username) {
      try {
        await fetch('/api/scores/livherojumper', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            username,
            flakes: finalScore,
          }),
        });
      } catch (error) {
        console.error('Failed to save score:', error);
      }
    }
  }, []);

  const startGame = useCallback(() => {
    setScore(0); // Reset score only when starting a new game
    setCurrentLevel(1);
    setLives(3);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
    setLevelCompleted(false);
  }, []);

  const restartGame = useCallback(() => {
    setScore(0);
    setCurrentLevel(1);
    setLives(3);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
    setLevelCompleted(false);
  }, []);

  return {
    score,
    currentLevel,
    lives,
    gameActive,
    gameOver,
    gameStarted,
    levelCompleted,
    startGame,
    endGame,
    updateScore,
    restartGame,
    loseLife,
    completeLevel,
    startNextLevel,
  };
}

