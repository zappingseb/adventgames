import { useEffect, useState } from 'react';
import { DEATH_FLAKES } from '../../constants/gameConstants';
import './GameHeader.css';
import { TYPOGRAPHY_CONSTANTS } from '../../constants/typographyConstants';

interface GameHeaderProps {
  score: number;
  groundFlakes: number;
  level: number;
  onBack: () => void;
  gameType?: 'snowflake' | 'flappybird' | 'typography' | 'livherojumper';
}

function GameHeader({ score, groundFlakes, level, onBack, gameType = 'snowflake' }: GameHeaderProps) {
  const remaining = gameType === 'flappybird' 
    ? 5 - groundFlakes 
    : gameType === 'typography'
    ? TYPOGRAPHY_CONSTANTS.MAX_MISTAKES - groundFlakes
    : gameType === 'livherojumper'
    ? 3 - groundFlakes
    : DEATH_FLAKES - groundFlakes;
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
          {gameType === 'flappybird' || gameType === 'typography' || gameType === 'livherojumper' ? 'Score' : 'Flakes'}: <span>{score}</span>
        </span>
        {(gameType === 'snowflake' || gameType === 'typography' || gameType === 'livherojumper') && <span className="level-display">Level: {level}</span>}
        <span className={`death-count ${isFlickering ? 'flicker' : ''}`}>
          {gameType === 'typography' ? '❌' : '💀'} {remaining}
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

