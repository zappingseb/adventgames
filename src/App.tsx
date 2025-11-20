import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import SnowflakeGame from './pages/SnowflakeGame';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/snowflake" element={<SnowflakeGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

