import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DesignerClickerGame from '../components/designerclicker/DesignerClickerGame';
import './DesignerClicker.css';

function DesignerClicker() {
  const navigate = useNavigate();

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="designer-clicker-page">
      <DesignerClickerGame onBack={() => navigate('/')} />
    </div>
  );
}

export default DesignerClicker;

