import { useEffect, useState } from 'react';
import { DEATH_FLAKES } from '../../constants/gameConstants';
import './GameHeader.css';

interface GameHeaderProps {
  score: number;
  groundFlakes: number;
  level: number;
  onBack: () => void;
}

function GameHeader({ score, groundFlakes, level, onBack }: GameHeaderProps) {
  const remaining = DEATH_FLAKES - groundFlakes;
  const [isFlickering, setIsFlickering] = useState(false);

  useEffect(() => {
    // Trigger flicker when groundFlakes changes
    setIsFlickering(true);
    const timer = setTimeout(() => {
      setIsFlickering(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [groundFlakes]);
  
  return (
    <div className="game-header">
      <div className="score-display">
        <span>Flakes: <span>{score}</span></span>
        <span className="level-display">Level: {level}</span>
        <span className={`death-count ${isFlickering ? 'flicker' : ''}`}>💀 {remaining}</span>
      </div>
      <a href="/" className="back-btn" onClick={(e) => {
        e.preventDefault();
        onBack();
      }}>
        ← Back
      </a>
    </div>
  );
}

export default GameHeader;

