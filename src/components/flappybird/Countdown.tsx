import './Countdown.css';

interface CountdownProps {
  count: number;
}

function Countdown({ count }: CountdownProps) {
  return (
    <div className="countdown-overlay">
      <div className="countdown-number">{count}</div>
    </div>
  );
}

export default Countdown;

