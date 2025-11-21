import { useState, useCallback } from 'react';

export function useFlappyBirdState() {
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const endGame = useCallback(async (finalScore: number) => {
    setGameActive(false);
    setGameOver(true);

    // Submit score to backend
    const username = localStorage.getItem('username');
    if (username) {
      try {
        await fetch('/api/scores/flappybird', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  const restartGame = useCallback(() => {
    setScore(0);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  return {
    score,
    gameActive,
    gameOver,
    gameStarted,
    startGame,
    endGame,
    updateScore,
    restartGame,
  };
}

