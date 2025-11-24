import './TypographyGameArea.css';

interface TypographyBinsProps {
  binLeft: string;
  binRight: string;
  showFeedback?: 'left' | 'right' | null;
  feedbackType?: 'correct' | 'incorrect' | null;
}

function TypographyBins({ binLeft, binRight, showFeedback, feedbackType }: TypographyBinsProps) {
  return (
    <div className="typography-bins">
      <div 
        className={`typography-bin bin-left ${showFeedback === 'left' ? (feedbackType === 'correct' ? 'correct' : 'incorrect') : ''}`}
      >
        <div className="bin-label">{binLeft}</div>
      </div>
      <div 
        className={`typography-bin bin-right ${showFeedback === 'right' ? (feedbackType === 'correct' ? 'correct' : 'incorrect') : ''}`}
      >
        <div className="bin-label">{binRight}</div>
      </div>
    </div>
  );
}

export default TypographyBins;

