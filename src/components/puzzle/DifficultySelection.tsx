import { PUZZLE_DIFFICULTIES } from '../../constants/puzzleConstants';
import './DifficultySelection.css';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultySelectionProps {
  onSelect: (difficulty: Difficulty) => void;
  selected?: Difficulty;
}

function DifficultySelection({ onSelect, selected }: DifficultySelectionProps) {
  return (
    <div className="difficulty-selection">
      <h2>Choose Difficulty</h2>
      <div className="difficulty-buttons">
        <button
          className={`difficulty-button ${selected === 'easy' ? 'selected' : ''}`}
          onClick={() => onSelect('easy')}
        >
          <div className="difficulty-name">Easy</div>
          <div className="difficulty-pieces">
            {PUZZLE_DIFFICULTIES.easy.pieceCount} pieces
          </div>
        </button>
        <button
          className={`difficulty-button ${selected === 'medium' ? 'selected' : ''}`}
          onClick={() => onSelect('medium')}
        >
          <div className="difficulty-name">Medium</div>
          <div className="difficulty-pieces">
            {PUZZLE_DIFFICULTIES.medium.pieceCount} pieces
          </div>
        </button>
        <button
          className={`difficulty-button ${selected === 'hard' ? 'selected' : ''}`}
          onClick={() => onSelect('hard')}
        >
          <div className="difficulty-name">Hard</div>
          <div className="difficulty-pieces">
            {PUZZLE_DIFFICULTIES.hard.pieceCount} pieces
          </div>
        </button>
      </div>
    </div>
  );
}

export default DifficultySelection;

