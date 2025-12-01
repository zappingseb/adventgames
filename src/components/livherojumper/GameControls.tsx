import './LivHeroJumperGame.css';

interface GameControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  disabled?: boolean;
}

function GameControls({ onMoveLeft, onMoveRight, onJump, disabled = false }: GameControlsProps) {
  return (
    <div className="game-controls">
      <button
        className="control-btn left-btn"
        onClick={onMoveLeft}
        disabled={disabled}
        aria-label="Move left"
      >
        ←
      </button>
      <button
        className="control-btn jump-btn"
        onClick={onJump}
        disabled={disabled}
        aria-label="Jump"
      >
        ↑
      </button>
      <button
        className="control-btn right-btn"
        onClick={onMoveRight}
        disabled={disabled}
        aria-label="Move right"
      >
        →
      </button>
    </div>
  );
}

export default GameControls;

