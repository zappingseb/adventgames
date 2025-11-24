import Leaderboard from '../Leaderboard';
import './GameOver.css';

interface GameOverProps {
  finalScore?: number;
  onRestart: () => void;
  mode?: 'start' | 'gameOver';
  gameName?: string;
}

function GameOver({ finalScore, onRestart, mode = 'gameOver', gameName = 'snowflake' }: GameOverProps) {
  const isStart = mode === 'start';
  
  const getInstructions = () => {
    if (gameName === 'snowflake') {
      return "This is the Designer Snowflake tapper, you win points, if you hit Snowflakes and modern tools, you loose on old tools, be aware!";
    }
    if (gameName === 'flappybird') {
      return "Choose your character and fly through obstacles! Tap or click to go up. Avoid hitting the obstacles. Do not fall! Score increases every second. Speed increases by 10% every 10 seconds!";
    }
    if (gameName === 'typography') {
      return "Swipe left or right to sort typography samples into the correct bins! Progress through 6 levels of increasing difficulty. You have 3 mistakes before game over.";
    }
    return "";
  };

  return (
    <div className="game-over">
      {isStart ? (
        <>
          <h2>
            {gameName === 'flappybird' ? 'Family Flappy Bird' : 
             gameName === 'typography' ? 'Typography Sorter' : 
             'Designer Snowflake Tapper'}
          </h2>
          <p className="instructions">{getInstructions()}</p>
          <button onClick={onRestart}>Start Game</button>
        </>
      ) : (
        <>
          <h2>Game Over!</h2>
          <p>
            {gameName === 'flappybird' 
              ? `You scored ${finalScore} points!`
              : gameName === 'typography'
              ? `You sorted ${finalScore} typography samples correctly!`
              : `You caught ${finalScore} snowflakes!`}
          </p>
          
          <Leaderboard gameName={gameName} />

          <button onClick={onRestart}>Play Again</button>
        </>
      )}
    </div>
  );
}

export default GameOver;

