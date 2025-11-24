import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameHeader from '../components/game/GameHeader';
import TypographyGameArea from '../components/typography/TypographyGameArea';
import GameOver from '../components/game/GameOver';
import { useTypographyState } from '../hooks/useTypographyState';
import './TypographyGame.css';
import { TYPOGRAPHY_CONSTANTS } from '../constants/typographyConstants';

function TypographyGame() {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState(1);
  const {
    score,
    mistakes,
    gameActive,
    gameOver,
    gameStarted,
    endGame,
    updateScore,
    addMistake,
    startGame,
    restartGame,
  } = useTypographyState();

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (mistakes >= TYPOGRAPHY_CONSTANTS.MAX_MISTAKES && gameActive) {
      endGame(score);
    }
  }, [mistakes, gameActive, score, endGame]);

  return (
    <div className="game-container typography-game-container">
      <GameHeader 
        score={score} 
        groundFlakes={mistakes}
        level={currentLevel}
        onBack={() => navigate('/')} 
        gameType="typography"
      />
      <TypographyGameArea
        gameActive={gameActive}
        onScoreUpdate={updateScore}
        onMistake={addMistake}
        onGameOver={() => endGame(score)}
        onLevelChange={setCurrentLevel}
      />
      {(!gameStarted || gameOver) && (
        <GameOver
          finalScore={gameOver ? score : undefined}
          onRestart={gameOver ? restartGame : startGame}
          mode={gameOver ? 'gameOver' : 'start'}
          gameName="typography"
        />
      )}
    </div>
  );
}

export default TypographyGame;

