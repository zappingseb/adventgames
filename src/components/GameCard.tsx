import './GameCard.css';

interface GameCardProps {
  title: string;
  description: string;
  path: string;
  enabled: boolean;
  onClick: () => void;
}

function GameCard({ title, description, enabled, onClick }: GameCardProps) {
  return (
    <div
      className={`game-card ${!enabled ? 'disabled' : ''}`}
      onClick={enabled ? onClick : undefined}
    >
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default GameCard;

