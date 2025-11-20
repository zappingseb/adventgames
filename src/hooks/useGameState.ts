import { useState, useCallback, useRef } from 'react';

export function useGameState() {
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const speedRef = useRef(2);
  const spawnIntervalRef = useRef(1000);

  const catchSnowflake = useCallback((_id: string, points: number = 1) => {
    setScore((prev) => prev + points);
  }, []);

  const endGame = useCallback(async () => {
    setGameActive(false);
    setGameOver(true);

    // Submit score to backend
    const username = localStorage.getItem('username');
    if (username) {
      try {
        await fetch('/api/scores/snowflake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            flakes: score,
          }),
        });
      } catch (error) {
        console.error('Failed to save score:', error);
      }
    }
  }, [score]);

  const startGame = useCallback(() => {
    setScore(0);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
    speedRef.current = 2;
    spawnIntervalRef.current = 1000;
  }, []);

  const restartGame = useCallback(() => {
    setScore(0);
    setGameActive(true);
    setGameOver(false);
    setGameStarted(true);
    speedRef.current = 2;
    spawnIntervalRef.current = 1000;
  }, []);

  return {
    score,
    gameActive,
    gameOver,
    gameStarted,
    startGame,
    endGame,
    catchSnowflake,
    restartGame,
    speed: speedRef.current,
    spawnInterval: spawnIntervalRef.current,
  };
}

