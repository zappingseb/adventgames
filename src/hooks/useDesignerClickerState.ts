import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DESIGNERS, PER_LEVEL_INCREASE } from '../constants/designerClickerConstants';
import { getApiHeaders } from '../config/apiConfig';

export interface DesignerClickerState {
  inspiration: number;
  style: number;
  level: number;
  ownedDesigners: { [key: string]: number };
  clickPower: number;
  passiveRate: number;
  gameOver: boolean;
}

export function useDesignerClickerState() {
  const [inspiration, setInspiration] = useState(0);
  const [level , setLevel] = useState(1);
  const [ownedDesigners, setOwnedDesigners] = useState<{ [key: string]: number }>({});
  const [clickPower, setClickPower] = useState(1);
  const [passiveRate, setPassiveRate] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastPurchaseRef = useRef<{ [key: string]: number }>({});

  // Calculate passive generation rate
  useEffect(() => {
    const calculatePassiveRate = () => {
      let rate = 0;
      
      // Base rates from owned designers - each gives constant IP/s per unit
      DESIGNERS.forEach((designer) => {
        const owned = ownedDesigners[designer.id] || 0;
        if (owned > 0) {
          const bonus = designer.bonusCondition ? designer.bonusCondition() : 1.0;
          rate += designer.baseRate * owned * bonus;
        }
      });

      // Each designer gives constant IP/s per unit (no level bonus)
      setPassiveRate(rate);
    };

    calculatePassiveRate();
  }, [ownedDesigners]);

  // Passive generation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000; // Convert to seconds
      lastUpdateRef.current = now;

      if (passiveRate > 0) {
        setInspiration((prev) => {
          const newInspiration = prev + passiveRate * deltaTime;
          return newInspiration;
        });
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [passiveRate]);

  // Calculate effective click power with clickRate multipliers
  const effectiveClickPower = useMemo(() => {
    let multiplier = 1;
    
    // Apply clickRate multipliers from all designers
    DESIGNERS.forEach((designer) => {
      if (designer.clickRate) {
        const owned = ownedDesigners[designer.id] || 0;
        if (owned > 0) {
          // Each unit multiplies by clickRate (e.g., clickRate^owned)
          multiplier *= Math.pow(designer.clickRate, owned);
        }
      }
    });
    
    return clickPower * multiplier;
  }, [clickPower, ownedDesigners]);

  const handleClick = useCallback(() => {
    if (gameOver) return; // Don't allow clicks when game is over
    setInspiration((prev) => prev + effectiveClickPower);
    
  }, [effectiveClickPower, ownedDesigners, gameOver]);

  const purchaseDesigner = useCallback((designerId: string, cost: number) => {
    console.log('purchaseDesigner', designerId, cost);
    console.log(
      `[purchaseDesigner] Triggered by: designerId=${designerId}, cost=${cost}`,
      {
        lastPurchase: lastPurchaseRef.current[designerId] || 0,
        now: Date.now(),
      }
    );
    const now = Date.now();
    const lastPurchase = lastPurchaseRef.current[designerId] || 0;
    
    // Prevent double purchases within 500ms (handles React StrictMode double renders)
    if (now - lastPurchase < 1500) {
      return;
    }
    
    // Record this purchase attempt
    lastPurchaseRef.current[designerId] = now;
    
    // Check purchase limit
    const designer = DESIGNERS.find(d => d.id === designerId);
    if (designer?.maxOwned !== undefined) {
      const currentOwned = ownedDesigners[designerId] || 0;
      if (currentOwned >= designer.maxOwned) {
        return; // Already at max, don't allow purchase
      }
    }
    
    // Use functional updates to get latest state
    setInspiration((prevInspiration) => {
      // Check if we can afford it
      if (prevInspiration < cost) {
        return prevInspiration;
      }
      
      return prevInspiration - cost;
    });

    // Update owned designers - this will only happen once per purchase
    return setOwnedDesigners((prevOwned) => {
        const currentOwned = prevOwned[designerId] || 0;
        // Double-check limit before incrementing
        if (designer?.maxOwned !== undefined && currentOwned >= designer.maxOwned) {
          return prevOwned; // Don't increment if at max
        }
        return {
          ...prevOwned,
          [designerId]: currentOwned + 1,
        };
      });
  }, [ownedDesigners]);

  // Check for level ups whenever inspiration changes
  useEffect(() => {
    const milestones = [100, 500, 2000, 10000, 50000];
    const nextLevel = level + 1;
    
    if (nextLevel <= milestones.length && inspiration >= milestones[nextLevel - 1]) {
      setLevel(nextLevel);
      setClickPower((prev) => prev + PER_LEVEL_INCREASE); // +10% click power per level
    }
  }, [inspiration, level]);

  const saveScore = useCallback(async (score: number) => {
    // Submit score to backend without ending the game
    const username = localStorage.getItem('username');
    if (username && score > 0) {
      try {
        await fetch('/api/scores/designerclicker', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            username,
            flakes: Math.floor(score),
          }),
        });
      } catch (error) {
        console.error('Failed to save score:', error);
      }
    }
  }, []);

  const endGame = useCallback(async (score: number) => {
    saveScore(score);
    
    // Set game over state and save final score
    setFinalScore(score);
    setGameOver(true);
  }, []);

  const restartGame = useCallback(() => {
    // Reset all game state
    setInspiration(0);
    setLevel(1);
    setOwnedDesigners({});
    setClickPower(1);
    setGameOver(false);
    setFinalScore(0);
    lastUpdateRef.current = Date.now();
    lastPurchaseRef.current = {};
  }, []);

  return {
    inspiration,
    level,
    ownedDesigners,
    clickPower: effectiveClickPower,
    passiveRate,
    gameOver,
    finalScore,
    handleClick,
    purchaseDesigner,
    saveScore,
    endGame,
    restartGame,
    setInspiration,
  };
}

