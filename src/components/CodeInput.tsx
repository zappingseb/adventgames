import { useState } from 'react';
import './CodeInput.css';

interface CodeInputProps {
  onActivate: (code: string) => Promise<void>;
}

function CodeInput({ onActivate }: CodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('Please enter a code');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onActivate(trimmedCode);
      setSuccess('Game activated!');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="code-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter activation code"
        maxLength={50}
        autoComplete="off"
        disabled={loading}
      />
      <button type="submit" disabled={loading || !code.trim()}>
        {loading ? 'Activating...' : 'Activate'}
      </button>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
    </form>
  );
}

export default CodeInput;

