import { useState } from 'react';
import './XmasGame.css';

function XmasGame() {
  const [password, setPassword] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPassword = password.trim().toUpperCase();
    
    if (trimmedPassword === 'PUPSNASE') {
      setIsCorrect(true);
      setError(null);
    } else {
      setError('Incorrect password. Try again.');
      setPassword('');
    }
  };

  const message = "Frohe Weihnachten\nam 13.7.26 gehst du zu Joss Stone.\n2ter Versuch!";

  if (isCorrect) {
    return (
      <div className="xmas-game-container">
        <div className="xmas-message">
          {message.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="xmas-game-container">
      <div className="xmas-password-form">
        <h1>Enter Password</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Enter password"
            autoComplete="off"
            autoFocus
            className="xmas-password-input"
          />
          <button type="submit" className="xmas-submit-button">
            Submit
          </button>
          {error && <p className="xmas-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default XmasGame;

