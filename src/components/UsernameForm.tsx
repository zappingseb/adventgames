import { useState, useEffect } from 'react';
import './UsernameForm.css';

interface UsernameFormProps {
  initialUsername: string;
  onSubmit: (username: string) => void;
}

function UsernameForm({ initialUsername, onSubmit }: UsernameFormProps) {
  const [username, setUsername] = useState(initialUsername);

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      onSubmit(trimmed);
    } else {
      alert('Please enter a username');
    }
  };

  return (
    <form className="username-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        maxLength={20}
        autoComplete="off"
      />
      <button type="submit">Start Playing</button>
    </form>
  );
}

export default UsernameForm;

