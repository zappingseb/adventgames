import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameHeader from '../components/game/GameHeader';
import GameArea from '../components/game/GameArea';
import GameOver from '../components/game/GameOver';
import { useGameState } from '../hooks/useGameState';
import './SnowflakeGame.css';

function SnowflakeGame() {
  const navigate = useNavigate();
  const [groundFlakes, setGroundFlakes] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const {
    score,
    gameActive,
    gameOver,
    gameStarted,
    endGame,
    catchSnowflake,
    startGame,
    restartGame,
  } = useGameState();

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (gameActive) {
      setGroundFlakes(0);
      setLevel(1);
    }
  }, [gameActive]);

  return (
    <div className="game-container">
      <GameHeader 
        score={score} 
        groundFlakes={groundFlakes}
        level={level}
        onBack={() => navigate('/')} 
      />
      <GameArea
        gameActive={gameActive}
        onCatch={catchSnowflake}
        onGameOver={endGame}
        score={score}
        onGroundFlakesChange={setGroundFlakes}
        onLevelChange={setLevel}
      />
      {(!gameStarted || gameOver) && (
        <GameOver
          finalScore={gameOver ? score : undefined}
          onRestart={gameOver ? restartGame : startGame}
          mode={gameOver ? 'gameOver' : 'start'}
          gameName="snowflake"
        />
      )}
    </div>
  );
}

export default SnowflakeGame;

