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
    if (gameName === 'designerclicker') {
      return "Click to design and earn Inspiration Points! Unlock designers to help you generate more IP. Reach max level and submit your score!";
    }
    if (gameName === 'livherojumper') {
      return "Jump over gaps across three columns! Use buttons or swipe left/right to move between columns, and swipe up or press jump to jump over gaps. At each level, checkout how Liv becomes better. Complete all 10 levels!";
    }
    if (gameName === 'puzzle') {
      return "Solve jigsaw puzzles with your own images! Drag and drop pieces to complete the puzzle. Choose your difficulty level to get started.";
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
             gameName === 'designerclicker' ? 'Designer Clicker' :
             gameName === 'livherojumper' ? 'Liv Hero Jumper' :
             gameName === 'puzzle' ? 'Jigsaw Puzzle' :
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
              ? `You scored ${finalScore ?? 0} points!`
              : gameName === 'typography'
              ? `You sorted ${finalScore ?? 0} typography samples correctly!`
              : gameName === 'designerclicker'
              ? `You earned ${(finalScore ?? 0).toLocaleString()} Inspiration Points!`
              : gameName === 'livherojumper'
              ? `You scored ${finalScore ?? 0} points!`
              : gameName === 'puzzle'
              ? `You completed the puzzle with a score of ${finalScore ?? 0}!`
              : `You caught ${finalScore ?? 0} snowflakes!`}
          </p>
          
          <Leaderboard gameName={gameName} />

          <button onClick={onRestart}>Play Again</button>
        </>
      )}
    </div>
  );
}

export default GameOver;

