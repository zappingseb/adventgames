import { useEffect, useState } from 'react';
import { DEATH_FLAKES } from '../../constants/gameConstants';
import './GameHeader.css';

interface GameHeaderProps {
  score: number;
  groundFlakes: number;
  level: number;
  onBack: () => void;
  gameType?: 'snowflake' | 'flappybird';
}

function GameHeader({ score, groundFlakes, level, onBack, gameType = 'snowflake' }: GameHeaderProps) {
  const remaining = gameType === 'flappybird' ? 5 - groundFlakes : DEATH_FLAKES - groundFlakes;
  const [isFlickering, setIsFlickering] = useState(false);
  const [scoreFlickering, setScoreFlickering] = useState(false);

  useEffect(() => {
    // Trigger flicker when groundFlakes changes (death count)
    setIsFlickering(true);
    const timer = setTimeout(() => {
      setIsFlickering(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [groundFlakes]);

  useEffect(() => {
    // Trigger score flicker when groundFlakes changes (barrier hit for flappybird)
    if (gameType === 'flappybird') {
      setScoreFlickering(true);
      const timer = setTimeout(() => {
        setScoreFlickering(false);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [groundFlakes, gameType]);
  
  return (
    <div className="game-header">
      <div className="score-display">
        <span className={scoreFlickering ? 'score-flicker' : ''}>
          {gameType === 'flappybird' ? 'Score' : 'Flakes'}: <span>{score}</span>
        </span>
        {gameType === 'snowflake' && <span className="level-display">Level: {level}</span>}
        <span className={`death-count ${isFlickering ? 'flicker' : ''}`}>
          {gameType === 'flappybird' ? '💀' : '💀'} {remaining}
        </span>
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

