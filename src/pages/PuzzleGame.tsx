import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PuzzleSelection, { Puzzle } from '../components/puzzle/PuzzleSelection';
import DifficultySelection, { Difficulty } from '../components/puzzle/DifficultySelection';
import PuzzleGame from '../components/puzzle/PuzzleGame';
import GameHeader from '../components/game/GameHeader';
import GameOver from '../components/game/GameOver';
import { usePuzzleState } from '../hooks/usePuzzleState';
import { cleanupPuzzleGame } from '../lib/puzzle/puzzleWrapper';
import './PuzzleGame.css';

function PuzzleGamePage() {
  const navigate = useNavigate();
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const {
    score,
    gameOver,
    endGame,
    startGame,
    restartGame,
    getCurrentScore,
  } = usePuzzleState();

  // Check for username
  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/');
    }
  }, [navigate]);

  const handlePuzzleSelect = (puzzle: Puzzle) => {
    setSelectedPuzzle(puzzle);
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    startGame(difficulty); // Start the score timer with difficulty-specific base score
    // Log will be done in PuzzleGame.tsx with dimensions
  };

  const handlePuzzleComplete = () => {
    // Score is already managed by usePuzzleState timer
    // The finalScore from puzzle-original.js is always 0 because window.puzzleCurrentScore isn't set
    // Get the current score using getCurrentScore() to avoid closure issues
    const currentScore = getCurrentScore();
    // Pass the current score to endGame
    endGame(true, currentScore);
  };

  const handleBack = () => {
    // Cleanup puzzle game when going back
    if (selectedPuzzle && selectedDifficulty) {
      cleanupPuzzleGame();
      // Go back to difficulty selection
      setSelectedDifficulty(null);
    } else if (selectedPuzzle) {
      cleanupPuzzleGame();
      // Go back to puzzle selection
      setSelectedPuzzle(null);
    } else {
      cleanupPuzzleGame();
      // Go back to home
      navigate('/');
    }
  };

  const handleRestart = () => {
    // Cleanup puzzle game
    cleanupPuzzleGame();
    // Reset to beginning - go back to puzzle selection
    setSelectedPuzzle(null);
    setSelectedDifficulty(null);
    restartGame();
  };

  return (
    <div className="puzzle-game-page">
      <GameHeader
        score={score}
        onBack={handleBack}
        level={1}
        groundFlakes={0}
        gameType="puzzle"
      />
      <div className="puzzle-game-area-container">
        {!selectedPuzzle ? (
          <PuzzleSelection onSelect={handlePuzzleSelect} />
        ) : !selectedDifficulty ? (
          <DifficultySelection
            onSelect={handleDifficultySelect}
          />
        ) : (
          <>
            {gameOver && (
              <GameOver
                finalScore={score}
                onRestart={handleRestart}
                mode="gameOver"
                gameName="puzzle"
              />
            )}
            <PuzzleGame
              puzzle={selectedPuzzle}
              difficulty={selectedDifficulty}
              onComplete={handlePuzzleComplete}
              onBack={handleBack}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default PuzzleGamePage;

