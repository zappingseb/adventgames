import { useEffect, useRef, useState } from 'react';
import { getApiHeaders } from '../../config/apiConfig';
import { getDifficultyForOrientation } from '../../constants/puzzleConstants';
import { Difficulty } from './DifficultySelection';
import { Puzzle } from './PuzzleSelection';
import { loadPuzzleScript, initPuzzleGame, cleanupPuzzleGame } from '../../lib/puzzle/puzzleWrapper';
import './PuzzleGame.css';

interface PuzzleGameProps {
  puzzle: Puzzle;
  difficulty: Difficulty;
  onComplete: () => void;
  onBack: () => void;
}

// Declare global types
declare global {
  interface Window {
    Kinetic: any;
    EXIF: any;
    Swipe: any;
    puzzleOnComplete?: (score: number) => void;
  }
}

function PuzzleGame({ puzzle, difficulty, onComplete, onBack }: PuzzleGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameInitialized, setGameInitialized] = useState(false);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    // Reset game initialized state when puzzle changes
    setGameInitialized(false);
    setImageUrl(null);
    
    // Cleanup any existing puzzle before loading new one
    cleanupPuzzleGame();
    
    // Cleanup container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Load new image
    loadImage();
    
    return () => {
      // Cleanup puzzle game properly on unmount
      cleanupPuzzleGame();
      
      // Cleanup container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      setGameInitialized(false);
    };
  }, [puzzle.id]);

  useEffect(() => {
    // Only initialize if we have a new image URL and haven't initialized yet
    if (imageUrl && containerRef.current && !gameInitialized && puzzle.id) {
      initializeGame();
    }
  }, [imageUrl, gameInitialized, puzzle.id]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(null);
      // Clear old image URL first
      setImageUrl(null);
      
      const response = await fetch(`/api/puzzles/${puzzle.id}/image`, {
        headers: getApiHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Failed to load puzzle image: ${response.statusText}`);
      }
      const data = await response.json();
      // Set new image URL - this will trigger game initialization
      setImageUrl(data.url);
    } catch (err) {
      setError('Failed to load puzzle image');
    } finally {
      setLoading(false);
    }
  };

  const loadScripts = (): Promise<void> => {
    return loadPuzzleScript().then(() => {
      scriptsLoadedRef.current = true;
    });
  };

  const initializeGame = async () => {
    if (!containerRef.current || !imageUrl) return;

    try {
      await loadScripts();

      // Determine orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      const difficultyConfig = getDifficultyForOrientation(difficulty, isPortrait);

      // Ensure container has proper dimensions
      if (!containerRef.current) return;
      
      // Cleanup any existing puzzle game first (this must happen before creating new one)
      cleanupPuzzleGame();
      
      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const container = containerRef.current;
      if (!container) return;
      
      container.innerHTML = ''; // Clear any existing content
      
      // Set responsive dimensions - use viewport units but allow flexibility
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.position = 'relative';
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.overflow = 'hidden';
      container.style.boxSizing = 'border-box';

      // Create a unique container ID
      const containerId = `puzzle-container-${puzzle.id}`;
      container.id = containerId;

      // Set up completion callback
      const handlePuzzleComplete = () => {
        // The finalScore from puzzle-original.js is always 0 because window.puzzleCurrentScore isn't set
        // Since score is managed by usePuzzleState, we call onComplete without a score
        // The parent will use getCurrentScore() to get the actual score
        onComplete();
      };

      // Wait a bit for container to get proper dimensions, then initialize
      setTimeout(() => {
        try {
          initPuzzleGame(
            containerId,
            imageUrl,
            difficultyConfig.rows,
            difficultyConfig.cols,
            handlePuzzleComplete
          );
          
          setGameInitialized(true);
        } catch (err) {
          setError('Failed to create puzzle game');
        }
      }, 100);
    } catch (err) {
      setError('Failed to initialize game');
    }
  };


  if (loading) {
    return (
      <div className="puzzle-game-container">
        <div className="puzzle-game-loading">Loading puzzle...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="puzzle-game-container">
        <div className="puzzle-game-error">{error}</div>
        <button onClick={onBack} className="puzzle-game-back-button">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="puzzle-game-container">
      <div ref={containerRef} className="puzzle-game-canvas" />
      {!gameInitialized && (
        <div className="puzzle-game-loading">Initializing game...</div>
      )}
    </div>
  );
}

export default PuzzleGame;

