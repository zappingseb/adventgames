import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CharacterSelection from '../components/flappybird/CharacterSelection';
import FlappyBirdGame from '../components/flappybird/FlappyBirdGame';
import GameOver from '../components/game/GameOver';
import Countdown from '../components/flappybird/Countdown';
import { useFlappyBirdState } from '../hooks/useFlappyBirdState';
import { Character } from '../constants/flappyBirdConstants';
import GameHeader from '../components/game/GameHeader';
import './FlappyBirdGame.css';

function FlappyBirdGamePage() {
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [barrierHits, setBarrierHits] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [localScore, setLocalScore] = useState<number>(0);
  const [showHelp , setShowHelp] = useState<boolean>(true);
  const {
    gameActive,
    gameOver,
    endGame,
    updateScore,
    startGame,
    restartGame,
  } = useFlappyBirdState();

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/');
    }
  }, [navigate]);

  // Handle score changes from FlappyBirdGame
  const handleScoreChange = useCallback((passedCount: number) => {
    setLocalScore((prev) => prev + passedCount);
  }, []);

  // Update parent score state when local score changes
  useEffect(() => {
    updateScore(localScore);
  }, [localScore, updateScore]);

  const handleCharacterSelect = (character: Character) => {
    setSelectedCharacter(character);
    setCountdown(3);
  };

  // Handle countdown
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Start game after countdown completes
      setTimeout(() => {
        setLocalScore(0);
        setBarrierHits(0);
        startGame();
        setCountdown(null);
      }, 100);
    }
  }, [countdown, startGame]);

  const handleGameOver = () => {
    endGame(localScore);
  };

  return (
    <div className="flappy-bird-page">
      <GameHeader 
        score={localScore} 
        onBack={() => navigate('/')}
        level={1}
        groundFlakes={barrierHits}
        gameType="flappybird"
      />
      <div className="game-area-container">
        {!selectedCharacter && (
          <>
          {showHelp && <GameOver mode="start" gameName="flappybird" onRestart={() => {setShowHelp(false);}} />}
          <CharacterSelection onSelect={handleCharacterSelect} />
          </>
        )}
        {selectedCharacter && (
          <>
            {countdown !== null && countdown > 0 && (
              <Countdown count={countdown} />
            )}
            {(countdown === null || countdown === 0) && (
              <FlappyBirdGame
                character={selectedCharacter}
                gameActive={gameActive}
                onScoreChange={handleScoreChange}
                onGameOver={handleGameOver}
                onBarrierHit={setBarrierHits}
              />
            )}
            {gameOver && (
              <GameOver
                finalScore={localScore}
                onRestart={() => {
                  setSelectedCharacter(null);
                  setCountdown(null);
                  restartGame();
                }}
                mode="gameOver"
                gameName="flappybird"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FlappyBirdGamePage;

