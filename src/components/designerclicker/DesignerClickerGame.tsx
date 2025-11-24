import { useEffect, useState, useRef } from 'react';
import { useDesignerClickerState } from '../../hooks/useDesignerClickerState';
import { LEVELS, DESIGNERS, getDesignerCost, getDesignerRate } from '../../constants/designerClickerConstants';
import DesignerClickerOnboarding, { DesignerClickerOnboardingRef } from './DesignerClickerOnboarding';
import GameOver from '../game/GameOver';
import './DesignerClickerGame.css';

interface DesignerClickerGameProps {
  onBack: () => void;
}

function DesignerClickerGame({ onBack }: DesignerClickerGameProps) {
  const {
    inspiration,
    style,
    level,
    ownedDesigners,
    clickPower,
    passiveRate,
    gameOver,
    finalScore,
    handleClick,
    purchaseDesigner,
    endGame,
    restartGame,
  } = useDesignerClickerState();

  const [clickAnimation, setClickAnimation] = useState<{ x: number; y: number; id: number }[]>([]);
  const [batteryBonus, setBatteryBonus] = useState(1.0);
  const [displayedInspiration, setDisplayedInspiration] = useState(0);
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);
  const onboardingRef = useRef<DesignerClickerOnboardingRef>(null);

  const currentLevel = LEVELS[level - 1] || LEVELS[0];
  const nextLevel = LEVELS[level] || null;
  const progress = nextLevel 
    ? (inspiration / nextLevel.milestone) * 100 
    : 100;

  // Check battery level for Steve Jobs bonus
  useEffect(() => {
    const checkBattery = async () => {
      try {
        // @ts-ignore - getBattery is not in all browsers
        if ('getBattery' in navigator) {
          // @ts-ignore
          const battery = await navigator.getBattery();
          setBatteryBonus(battery.level < 0.2 ? 2.0 : 1.0);
          
          battery.addEventListener('levelchange', () => {
            setBatteryBonus(battery.level < 0.2 ? 2.0 : 1.0);
          });
        }
      } catch (e) {
        // Battery API not available
      }
    };
    checkBattery();
  }, []);

  // Apply theme based on level
  useEffect(() => {
    document.body.className = `designer-clicker theme-${currentLevel.theme}`;
    return () => {
      document.body.className = '';
    };
  }, [currentLevel.theme]);

  // Count-up animation for inspiration
  useEffect(() => {
    const target = Math.floor(inspiration);
    
    if (target !== displayedInspiration) {
      const diff = target - displayedInspiration;
      const steps = Math.min(30, Math.abs(diff));
      const increment = diff / steps;
      const duration = 400;
      const stepTime = duration / steps;
      
      let step = 0;
      const startValue = displayedInspiration;
      const timer = setInterval(() => {
        step++;
        const newValue = startValue + increment * step;
        setDisplayedInspiration(Math.floor(newValue));
        if (step >= steps) {
          clearInterval(timer);
          setDisplayedInspiration(target);
        }
      }, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [inspiration, displayedInspiration]);

  const handleClickWithAnimation = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    handleClick();
    
    // Advance onboarding on step 1
    if (onboardingRef.current?.getCurrentStep() === 1) {
      onboardingRef.current.advanceStep();
    }
    
    // Create click animation
    const newId = Date.now();
    setClickAnimation((prev) => [...prev, { x, y, id: newId }]);
    
    // Remove animation after it completes
    setTimeout(() => {
      setClickAnimation((prev) => prev.filter((anim) => anim.id !== newId));
    }, 1000);
  };

  const handleDesignerClick = (e: React.MouseEvent, designerId: string) => {
    e.stopPropagation();
    if (selectedDesigner === designerId) {
      setSelectedDesigner(null);
    } else {
      setSelectedDesigner(designerId);
      // Advance onboarding on step 2
      if (onboardingRef.current?.getCurrentStep() === 2) {
        onboardingRef.current.advanceStep();
      }
    }
  };

  const handleClickOutside = () => {
    setSelectedDesigner(null);
  };

  if (gameOver) {
    return (
      <GameOver
        finalScore={Math.floor(finalScore)}
        onRestart={restartGame}
        mode="gameOver"
        gameName="designerclicker"
      />
    );
  }

  return (
    <div 
      className={`designer-clicker-game theme-${currentLevel.theme}`}
      onClick={handleClickOutside}
    >
      <DesignerClickerOnboarding ref={onboardingRef} />
      <div className="designer-header" id="onboarding-target-top">
        <button className="back-button" onClick={onBack}>← Back</button>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Inspiration:</span>
            <span className="stat-value">{displayedInspiration.toLocaleString()}</span>
          </div>
          {style > 0 && (
            <div className="stat">
              <span className="stat-label">Style:</span>
              <span className="stat-value">{Math.floor(style).toLocaleString()}</span>
            </div>
          )}
          <div className="stat">
            <span className="stat-label">Level {level}:</span>
            <span className="stat-value">{currentLevel.name}</span>
          </div>
        </div>
      </div>

      <div className="game-area">
        <div className="product-display">
          <div className="product-image-container">
            {currentLevel.image && (
              <img 
                src={currentLevel.image} 
                alt={currentLevel.name}
                className="product-image"
              />
            )}
            <div className="product-info">
              <h2>{currentLevel.name}</h2>
              <p>{currentLevel.description}</p>
            </div>
          </div>
        </div>

        <div className="click-section">
          <button 
            className="click-button"
            onClick={handleClickWithAnimation}
            id="onboarding-target-button"
          >
            <span className="click-icon">✨</span>
            <span className="click-text">Design, Design, ...</span>
            <span className="click-power">+{clickPower} IP</span>
          </button>
          
          {clickAnimation.map((anim) => (
            <div
              key={anim.id}
              className="click-animation"
              style={{
                left: `${anim.x}px`,
                top: `${anim.y}px`,
              }}
            >
              +{clickPower}
            </div>
          ))}
        </div>

        <div className="progress-section">
          <div className="progress-label">
            {nextLevel ? (
              <>{displayedInspiration.toLocaleString()} / {nextLevel.milestone.toLocaleString()} IP</>
            ) : (
              <>{displayedInspiration.toLocaleString()} IP</>
            )}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {!nextLevel && (
            <button 
              className="endgame-button"
              onClick={() => endGame(inspiration)}
            >
              End Game
            </button>
          )}
        </div>

        {passiveRate > 0 && (
          <div className="passive-rate">
            Generating {passiveRate.toFixed(1)} IP/s
          </div>
        )}
      </div>

      <div className="upgrades-sidebar" id="onboarding-target-sidebar">
        {DESIGNERS.map((designer) => {
          const owned = ownedDesigners[designer.id] || 0;
          const cost = getDesignerCost(designer.cost, owned);
          const isMonochrome = document.body.classList.contains('monochrome-gray');
          const rate = getDesignerRate(designer.id, designer.baseRate, owned, batteryBonus, isMonochrome);
          const canAfford = inspiration >= cost;
          const isSelected = selectedDesigner === designer.id;

          return (
            <div key={designer.id} style={{ position: 'relative' }}>
              <div 
                className={`upgrade-icon ${canAfford ? 'affordable' : 'disabled'} ${owned > 0 ? 'owned' : ''}`}
                onClick={(e) => handleDesignerClick(e, designer.id)}
              >
                <img 
                  src={`/designers/${designer.id}.png`}
                  alt={designer.name}
                  className="upgrade-icon-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {owned > 0 && <span className="upgrade-count">{owned}</span>}
              </div>
              {isSelected && (
                <div className="designer-details-popup" onClick={(e) => e.stopPropagation()}>
                  <h4>{designer.name}</h4>
                  <p className="designer-details-title">{designer.title}</p>
                  <div className="designer-details-stats">
                    {designer.clickRate ? (
                      <div className="designer-detail-item">
                        <span className="detail-label">Effect:</span>
                        <span className="detail-value">×{designer.clickRate} Click Power per unit</span>
                      </div>
                    ) : (
                      <div className="designer-detail-item">
                        <span className="detail-label">Speed:</span>
                        <span className="detail-value">+{rate > 0 ? rate.toFixed(1) : designer.baseRate} IP/s</span>
                      </div>
                    )}
                    <div className="designer-detail-item">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value">{cost.toLocaleString()} IP</span>
                    </div>
                    {owned > 0 && (
                      <div className="designer-detail-item">
                        <span className="detail-label">Owned:</span>
                        <span className="detail-value">{owned}</span>
                      </div>
                    )}
                  </div>
                  {canAfford && (
                    <button 
                      className="designer-purchase-btn"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        purchaseDesigner(designer.id, cost);
                      }}
                    >
                      Buy Now
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DesignerClickerGame;

