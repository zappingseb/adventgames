import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CharacterSelection from '../components/flappybird/CharacterSelection';
import FlappyBirdGame from '../components/flappybird/FlappyBirdGame';
import GameOver from '../components/game/GameOver';
import { useFlappyBirdState } from '../hooks/useFlappyBirdState';
import { Character } from '../constants/flappyBirdConstants';
import GameHeader from '../components/game/GameHeader';
import './FlappyBirdGame.css';

function FlappyBirdGamePage() {
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const {
    score,
    gameActive,
    gameOver,
    gameStarted,
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

  const handleCharacterSelect = (character: Character) => {
    setSelectedCharacter(character);
    startGame();
  };

  const handleGameOver = () => {
    endGame(score);
  };

  return (
    <div className="flappy-bird-page">
      <GameHeader 
        score={score} 
        onBack={() => navigate('/')}
        level={1}
        groundFlakes={0}
      />
      <div className="game-area-container">
        {!selectedCharacter && (
          <CharacterSelection onSelect={handleCharacterSelect} />
        )}
        {selectedCharacter && (
          <>
            <FlappyBirdGame
              character={selectedCharacter}
              gameActive={gameActive}
              onScoreChange={updateScore}
              onGameOver={handleGameOver}
            />
            {gameOver && (
              <GameOver
                finalScore={score}
                onRestart={() => {
                  setSelectedCharacter(null);
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

