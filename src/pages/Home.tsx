import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UsernameForm from '../components/UsernameForm';
import GameCard from '../components/GameCard';
import CodeInput from '../components/CodeInput';
import { getGames, activateGame, Game } from '../services/gameService';
import './Home.css';

function Home() {
  const [username, setUsername] = useState<string>('');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [activationMessage, setActivationMessage] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const allGames = await getGames();
      // Only show activated games
      const activatedGames = allGames.filter(game => game.activated);
      setGames(activatedGames);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle code query parameter from URL (for QR codes)
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const activateFromUrl = async () => {
        try {
          await activateGame(code);
          setActivationMessage(`✅ Game activated successfully!`);
          // Remove code from URL
          setSearchParams({});
          // Reload games to show newly activated game
          await loadGames();
          // Clear message after 3 seconds
          setTimeout(() => setActivationMessage(''), 3000);
        } catch (error) {
          setActivationMessage(`❌ Invalid activation code`);
          // Remove code from URL even on error
          setSearchParams({});
          // Clear message after 3 seconds
          setTimeout(() => setActivationMessage(''), 3000);
        }
      };
      activateFromUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleUsernameSubmit = (newUsername: string) => {
    localStorage.setItem('username', newUsername);
    setUsername(newUsername);
  };

  const handleActivate = async (code: string) => {
    try {
      await activateGame(code);
      setActivationMessage(`✅ Game activated successfully!`);
      // Reload games to show newly activated game
      await loadGames();
      // Clear message after 3 seconds
      setTimeout(() => setActivationMessage(''), 3000);
    } catch (error) {
      setActivationMessage(`❌ Invalid activation code`);
      // Clear message after 3 seconds
      setTimeout(() => setActivationMessage(''), 3000);
    }
  };

  const handleGameClick = (path: string) => {
    if (!username) {
      alert('Please enter a username first');
      return;
    }
    navigate(path);
  };

  return (
    <div className="home-container">
      <h1>❄️ Liv's Advent of games & Quatsch</h1>
      <UsernameForm 
        initialUsername={username}
        onSubmit={handleUsernameSubmit}
      />
      {activationMessage && (
        <div style={{ 
          color: activationMessage.includes('✅') ? '#4caf50' : '#f44336',
          textAlign: 'center',
          margin: '10px 0',
          padding: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '5px'
        }}>
          {activationMessage}
        </div>
      )}
      <CodeInput onActivate={handleActivate} />
      <div className="games-list">
        {loading ? (
          <p style={{ color: 'white', textAlign: 'center' }}>Loading games...</p>
        ) : games.length > 0 ? (
          games.map((game) => (
            <GameCard
              key={game.name}
              title={game.title}
              description={game.description}
              path={game.path}
              enabled={!!username}
              onClick={() => handleGameClick(game.path)}
            />
          ))
        ) : (
          <p style={{ color: 'white', textAlign: 'center', opacity: 0.7 }}>
            No games activated yet. Enter a code to unlock games!
          </p>
        )}
      </div>
    </div>
  );
}

export default Home;

