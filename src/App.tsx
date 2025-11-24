import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import SnowflakeGame from './pages/SnowflakeGame';
import FlappyBirdGamePage from './pages/FlappyBirdGame';
import TypographyGame from './pages/TypographyGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/snowflake" element={<SnowflakeGame />} />
      <Route path="/flappybird" element={<FlappyBirdGamePage />} />
      <Route path="/typography" element={<TypographyGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

