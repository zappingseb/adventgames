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
    return "";
  };

  return (
    <div className="game-over">
      {isStart ? (
        <>
          <h2>Designer Snowflake Tapper</h2>
          <p className="instructions">{getInstructions()}</p>
          <button onClick={onRestart}>Start Game</button>
        </>
      ) : (
        <>
          <h2>Game Over!</h2>
          <p>You caught <span>{finalScore}</span> snowflakes!</p>
          
          <Leaderboard gameName={gameName} />

          <button onClick={onRestart}>Play Again</button>
        </>
      )}
    </div>
  );
}

export default GameOver;

