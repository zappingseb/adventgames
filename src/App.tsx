import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import SnowflakeGame from './pages/SnowflakeGame';
import FlappyBirdGamePage from './pages/FlappyBirdGame';
import TypographyGame from './pages/TypographyGame';
import DesignerClicker from './pages/DesignerClicker';
import LivHeroJumperGamePage from './pages/LivHeroJumperGame';
import PuzzleGamePage from './pages/PuzzleGame';
import XmasGame from './pages/XmasGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/snowflake" element={<SnowflakeGame />} />
      <Route path="/flappybird" element={<FlappyBirdGamePage />} />
      <Route path="/typography" element={<TypographyGame />} />
      <Route path="/designerclicker" element={<DesignerClicker />} />
      <Route path="/livherojumper" element={<LivHeroJumperGamePage />} />
      <Route path="/puzzle" element={<PuzzleGamePage />} />
      <Route path="/puzzlegame" element={<PuzzleGamePage />} />
      <Route path="/xmasgame" element={<XmasGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

