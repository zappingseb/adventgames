import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../services/leaderboardService';
import './Leaderboard.css';

interface LeaderboardProps {
  gameName: string;
}

function Leaderboard({ gameName }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getLeaderboard(gameName);
        setLeaderboard(data);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [gameName]);

  if (loading) {
    return (
      <div className="leaderboard">
        <h3>Top 5 Leaderboard</h3>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard">
        <h3>Top 5 Leaderboard</h3>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h3>Top 5 Leaderboard</h3>
      {leaderboard.length > 0 ? (
        <ol className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <li key={`${entry.username}-${entry.timestamp}-${index}`} className="leaderboard-item">
              <span className="rank">#{index + 1}</span>
              <span className="username">{entry.username}</span>
              <span className="score">{entry.flakes} ❄️</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="no-scores">No scores yet!</p>
      )}
    </div>
  );
}

export default Leaderboard;

