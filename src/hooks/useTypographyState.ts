import { useState, useCallback } from 'react';
import { TYPOGRAPHY_CONSTANTS } from '../constants/typographyConstants';
import { getApiHeaders } from '../config/apiConfig';

export function useTypographyState() {
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  const updateScore = useCallback((points: number = 1) => {
    setScore((prev) => prev + points);
  }, []);

  const addMistake = useCallback(() => {
    setMistakes((prev) => {
      const newMistakes = prev + 1;
      if (newMistakes >= TYPOGRAPHY_CONSTANTS.MAX_MISTAKES) {
        setGameActive(false);
        setGameOver(true);
      }
      return newMistakes;
    });
  }, []);

  const endGame = useCallback(async (finalScore: number) => {
    setGameActive(false);
    setGameOver(true);

    // Submit score to backend
    const username = localStorage.getItem('username');
    if (username) {
      try {
        await fetch('/api/scores/typography', {
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
    setScore(0);
    setMistakes(0);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  const restartGame = useCallback(() => {
    setScore(0);
    setMistakes(0);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  return {
    score,
    mistakes,
    gameActive,
    gameOver,
    gameStarted,
    startGame,
    endGame,
    updateScore,
    addMistake,
    restartGame,
  };
}

