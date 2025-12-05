import { useState, useEffect } from 'react';
import { Designer } from '../../constants/designerClickerConstants';
import { getDesignerCost, getDesignerRate } from '../../constants/designerClickerConstants';

interface DesignerListProps {
  designers: Designer[];
  ownedDesigners: { [key: string]: number };
  inspiration: number;
  batteryBonus: number;
  selectedDesigner: string | null;
  onDesignerClick: (e: React.MouseEvent, designerId: string) => void;
  onPurchase: (designerId: string, cost: number) => void;
  isPurchaseOnCooldown: (designerId: string) => boolean;
}

function DesignerList({
  designers,
  ownedDesigners,
  inspiration,
  batteryBonus,
  selectedDesigner,
  onDesignerClick,
  onPurchase,
  isPurchaseOnCooldown,
}: DesignerListProps) {
  // Force re-render every 100ms to update button disabled state during cooldown
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if any designer is on cooldown
      const anyOnCooldown = designers.some(designer => isPurchaseOnCooldown(designer.id));
      if (anyOnCooldown) {
        setTick(prev => prev + 1);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [designers, isPurchaseOnCooldown]);

  return (
    <div className="upgrades-sidebar" id="onboarding-target-sidebar">
      {designers.map((designer) => {
        const owned = ownedDesigners[designer.id] || 0;
        const cost = getDesignerCost(designer.cost, owned);
        const isMonochrome = document.body.classList.contains('monochrome-gray');
        const rate = getDesignerRate(designer.id, designer.baseRate, owned, batteryBonus, isMonochrome);
        const canAfford = inspiration >= cost;
        const isSelected = selectedDesigner === designer.id;
        const isMaxed = designer.maxOwned !== undefined && owned >= designer.maxOwned;

        return (
          <div key={designer.id} style={{ position: 'relative' }}>
            <div 
              className={`upgrade-icon ${canAfford && !isMaxed ? 'affordable' : 'disabled'} ${owned > 0 ? 'owned' : ''}`}
              onClick={(e) => onDesignerClick(e, designer.id)}
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
                      <span className="detail-value">{owned}{designer.maxOwned ? ` / ${designer.maxOwned}` : ''}</span>
                    </div>
                  )}
                  {isMaxed && (
                    <div className="designer-detail-item">
                      <span className="detail-label" style={{ color: '#ffd700', fontWeight: 'bold' }}>MAXED OUT</span>
                    </div>
                  )}
                </div>
                {isMaxed ? (
                  <button 
                    className="designer-purchase-btn"
                    type="button"
                    disabled
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    Max Purchased
                  </button>
                ) : canAfford ? (
                  <button 
                    className="designer-purchase-btn"
                    type="button"
                    disabled={isPurchaseOnCooldown(designer.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!isPurchaseOnCooldown(designer.id)) {
                        onPurchase(designer.id, cost);
                      }
                    }}
                  >
                    Buy Now
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DesignerList;

