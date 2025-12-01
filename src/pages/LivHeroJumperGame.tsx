import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GameHeader from '../components/game/GameHeader';
import LivHeroJumperGame from '../components/livherojumper/LivHeroJumperGame';
import GameControls from '../components/livherojumper/GameControls';
import LevelCompletion from '../components/livherojumper/LevelCompletion';
import GameOver from '../components/game/GameOver';
import { useLivHeroJumperState } from '../hooks/useLivHeroJumperState';
import './LivHeroJumperGame.css';

function LivHeroJumperGamePage() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [resetDistance, setResetDistance] = useState<boolean>(false);
  const {
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
  } = useLivHeroJumperState();

  const gameComponentRef = useRef<{ handleMoveLeft: () => void; handleMoveRight: () => void; handleJump: () => void } | null>(null);

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/');
    }
  }, [navigate]);

  const handleMoveLeft = useCallback(() => {
    if (gameComponentRef.current) {
      gameComponentRef.current.handleMoveLeft();
    }
  }, []);

  const handleMoveRight = useCallback(() => {
    if (gameComponentRef.current) {
      gameComponentRef.current.handleMoveRight();
    }
  }, []);

  const handleJump = useCallback(() => {
    if (gameComponentRef.current) {
      gameComponentRef.current.handleJump();
    }
  }, []);

  useEffect(() => {
    if (gameOver && gameStarted) {
      endGame(score);
    }
  }, [gameOver, gameStarted, score, endGame]);

  // Reset the resetDistance flag after it's been used
  useEffect(() => {
    if (resetDistance && gameActive) {
      // Small delay to ensure the reset has been processed
      setTimeout(() => {
        setResetDistance(false);
      }, 100);
    }
  }, [resetDistance, gameActive]);

  return (
    <div className="liv-hero-jumper-page">
      <GameHeader
        score={score}
        groundFlakes={3 - lives}
        level={currentLevel}
        onBack={() => navigate('/')}
        gameType="livherojumper"
      />
      <div className="game-area-container">
        {!gameStarted && (
          <>
            {showHelp && (
              <GameOver
                mode="start"
                gameName="livherojumper"
                onRestart={() => {
                  setShowHelp(false);
                  setResetDistance(true); // Reset cumulative distance for new game
                  startGame();
                }}
              />
            )}
          </>
        )}
        {gameStarted && !levelCompleted && !gameOver && (
          <>
            <LivHeroJumperGame
              ref={gameComponentRef}
              level={currentLevel}
              gameActive={gameActive}
              onScoreChange={updateScore}
              onLoseLife={loseLife}
              onLevelComplete={completeLevel}
              onMoveLeft={handleMoveLeft}
              onMoveRight={handleMoveRight}
              onJump={handleJump}
              resetCumulativeDistance={resetDistance}
            />
            <GameControls
              onMoveLeft={handleMoveLeft}
              onMoveRight={handleMoveRight}
              onJump={handleJump}
              disabled={!gameActive}
            />
          </>
        )}
        {levelCompleted && (
          <LevelCompletion 
            level={currentLevel} 
            onNextLevel={() => {
              // Don't reset cumulative distance when going to next level
              startNextLevel();
            }} 
          />
        )}
        {gameOver && (
          <GameOver
            finalScore={score}
            onRestart={() => {
              setResetDistance(true); // Reset cumulative distance for new game
              restartGame();
            }}
            mode="gameOver"
            gameName="livherojumper"
          />
        )}
      </div>
    </div>
  );
}

export default LivHeroJumperGamePage;

