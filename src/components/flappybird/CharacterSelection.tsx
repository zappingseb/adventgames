import { CHARACTERS, Character } from '../../constants/flappyBirdConstants';
import './CharacterSelection.css';

interface CharacterSelectionProps {
  onSelect: (character: Character) => void;
}

function CharacterSelection({ onSelect }: CharacterSelectionProps) {
  return (
    <div className="character-selection">
      <h2>Choose Your Character</h2>
      <div className="characters-grid">
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            className="character-card"
            onClick={() => onSelect(character)}
          >
            <div className="character-emoji">{character.emoji}</div>
            <div className="character-name">{character.name}</div>
            <div className="character-obstacle">Avoid: {character.obstacle}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CharacterSelection;

