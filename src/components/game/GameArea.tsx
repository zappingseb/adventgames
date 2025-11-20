import { useEffect, useRef, useState, useCallback } from 'react';
import Snowflake from './Snowflake';
import { DEATH_FLAKES, LEVEL_UP_FLAKES } from '../../constants/gameConstants';
import './GameArea.css';

interface GameAreaProps {
  gameActive: boolean;
  onCatch: (id: string, points: number) => void;
  onGameOver: () => void;
  score: number;
  onGroundFlakesChange: (count: number) => void;
  onLevelChange: (level: number) => void;
}

export type FlakeType = 'normal' | 'figma' | 'indesign';

interface SnowflakeData {
  id: string;
  x: number;
  y: number;
  speed: number;
  onGround: boolean;
  type: FlakeType;
  random: number;
}

function GameArea({ gameActive, onCatch, onGameOver, score, onGroundFlakesChange, onLevelChange }: GameAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snowflakes, setSnowflakes] = useState<SnowflakeData[]>([]);
  const groundFlakesRef = useRef<number>(0);
  const countedFlakesRef = useRef<Set<string>>(new Set());
  const caughtFlakesRef = useRef<Set<string>>(new Set());
  const scheduledCatchRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const speedRef = useRef<number>(2);
  const spawnIntervalRef = useRef<number>(1000);
  const lastSpeedIncreaseRef = useRef<number>(0);
  const pendingGroundCountRef = useRef<number | null>(null);
  const currentLevelRef = useRef<number>(1);
  const pendingLevelRef = useRef<number | null>(null);
  const onCatchRef = useRef(onCatch);
  const flakeCountRef = useRef<number>(0);
  const [groundCountTrigger, setGroundCountTrigger] = useState(0);
  const [levelTrigger, setLevelTrigger] = useState(0);

  const SPEED_INCREASE_FACTOR = 1.1; // 10% increase

  // Keep onCatch ref up to date
  useEffect(() => {
    onCatchRef.current = onCatch;
  }, [onCatch]);

  // Update speed based on score (only when crossing thresholds)
  // Level up happens every LEVEL_UP_FLAKES points, incrementing by 1 each time
  useEffect(() => {
    if (score > 0) {
      const currentThreshold = Math.floor(score / LEVEL_UP_FLAKES);
      const lastThreshold = lastSpeedIncreaseRef.current;
      
      // Only level up when crossing a new threshold (increment by 1)
      if (currentThreshold > lastThreshold) {
        const newLevel = currentLevelRef.current + 1;
        currentLevelRef.current = newLevel;
        lastSpeedIncreaseRef.current = currentThreshold;
        
        // Increase speed by exactly 10% per level (only 1 level at a time)
        speedRef.current *= SPEED_INCREASE_FACTOR;
        spawnIntervalRef.current = Math.max(300, spawnIntervalRef.current * 0.95);
        
        pendingLevelRef.current = newLevel;
        setLevelTrigger(prev => prev + 1);
      }
    }
  }, [score]);

  const createSnowflake = useCallback(() => {
    if (!gameActive || !containerRef.current) return;

    const gameWidth = window.innerWidth;
    const id = `${Date.now()}-${Math.random()}`;
    flakeCountRef.current++;

    // Determine flake type: max every 10th flake can be special
    let type: FlakeType = 'normal';
    if (flakeCountRef.current % 6 === 0) {
      // Every 10th flake is special - randomly choose Figma or Indesign
      type = Math.random() < 0.5 ? 'figma' : 'indesign';
    }

    const flakeData: SnowflakeData = {
      id,
      x: Math.random() * (gameWidth - 40),
      y: -40,
      speed: speedRef.current,
      onGround: false,
      type,
      random: Math.random(),
    };

    setSnowflakes((prev) => [...prev, flakeData]);
    lastSpawnRef.current = Date.now();
  }, [gameActive]);

  const catchSnowflake = useCallback((id: string) => {
    if (!gameActive) return;

    // Prevent duplicate catches - check and mark immediately
    if (caughtFlakesRef.current.has(id)) {
      return;
    }
    
    // Mark as caught immediately to prevent duplicate calls
    caughtFlakesRef.current.add(id);

    setSnowflakes((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      if (index === -1) return prev;

      const flake = prev[index];
      const wasOnGround = flake.onGround;

      // If flake was on ground, reduce ground count (no points)
      if (wasOnGround) {
        const newGroundCount = Math.max(0, groundFlakesRef.current - 1);
        groundFlakesRef.current = newGroundCount;
        pendingGroundCountRef.current = newGroundCount;
        // Trigger update after render
        setTimeout(() => {
          setGroundCountTrigger(prev => prev + 1);
        }, 0);
      } else {
        // Handle different flake types
        const points = flake.type === 'figma' ? 2 : flake.type === 'indesign' ? 0 : 1;
        
        if (flake.type === 'indesign') {
          // Indesign icon: lose a life immediately
          const newGroundCount = Math.min(DEATH_FLAKES, groundFlakesRef.current + 1);
          groundFlakesRef.current = newGroundCount;
          pendingGroundCountRef.current = newGroundCount;
          setTimeout(() => {
            setGroundCountTrigger(prev => prev + 1);
          }, 0);
          
          // Check if game over
          if (newGroundCount >= DEATH_FLAKES) {
            setTimeout(() => onGameOver(), 0);
          }
        } else {
          // Normal or Figma: give points
          // Only schedule onCatch if we haven't already scheduled it for this ID
          // This prevents double calls even if setState callback runs multiple times
          if (!scheduledCatchRef.current.has(id)) {
            scheduledCatchRef.current.add(id);
            setTimeout(() => {
              console.log('onCatch', id, points);
              onCatchRef.current(id, points);
              scheduledCatchRef.current.delete(id);
            }, 0);
          }
        }
      }

      // Remove the flake from state
      return prev.filter((f) => f.id !== id);
    });
  }, [gameActive]);

  const update = useCallback(() => {
    if (!gameActive || !containerRef.current) return;

    const now = Date.now();
    const gameHeight = window.innerHeight;

    // Spawn new snowflakes
    if (now - lastSpawnRef.current > spawnIntervalRef.current) {
      createSnowflake();
    }

    // Update existing snowflakes
    setSnowflakes((prev) => {
      let newGroundCount = groundFlakesRef.current;
      let shouldEndGame = false;

      // move flakes down
      const updated = prev.map((flake) => {
        const newY = flake.y + flake.speed;

        return {
          ...flake,
          y: newY,
        };
      });

      // Remove flakes that are off screen
      const filtered = updated.filter((flake) => {
        if (flake.y > gameHeight + 50) {
          // If flake went off screen without being caught and wasn't already on ground,
          // count it as a missed flake (except InDesign which was already handled when caught)
          // Only count if we haven't already counted this flake
          if (!flake.onGround && flake.type !== 'indesign' && !countedFlakesRef.current.has(flake.id)) {
            countedFlakesRef.current.add(flake.id);
            newGroundCount++;
            if (newGroundCount >= DEATH_FLAKES) {
              shouldEndGame = true;
            }
          }
          return false;
        }
        return true;
      });

      // Update ground flakes count if it changed (store for useEffect)
      if (newGroundCount !== groundFlakesRef.current) {
        groundFlakesRef.current = newGroundCount;
        pendingGroundCountRef.current = newGroundCount;
        // Trigger update after render
        setTimeout(() => {
          setGroundCountTrigger(prev => prev + 1);
        }, 0);
      }

      // End game if threshold reached
      if (shouldEndGame) {
        setTimeout(() => onGameOver(), 0);
      }

      return filtered;
    });

    animationFrameRef.current = requestAnimationFrame(update);
  }, [gameActive, createSnowflake, onGameOver, onGroundFlakesChange]);

  useEffect(() => {
    if (gameActive) {
      update();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive, update]);

  // Update parent component with ground flakes count (outside render)
  useEffect(() => {
    if (pendingGroundCountRef.current !== null) {
      const count = pendingGroundCountRef.current;
      pendingGroundCountRef.current = null;
      onGroundFlakesChange(count);
    }
  }, [groundCountTrigger, onGroundFlakesChange]);

  useEffect(() => {
    if (pendingLevelRef.current !== null) {
      const level = pendingLevelRef.current;
      pendingLevelRef.current = null;
      onLevelChange(level);
    }
  }, [levelTrigger, onLevelChange]);


  // Reset when game restarts
  useEffect(() => {
    if (gameActive) {
      setSnowflakes([]);
      groundFlakesRef.current = 0;
      countedFlakesRef.current.clear();
      caughtFlakesRef.current.clear();
      scheduledCatchRef.current.clear();
      pendingGroundCountRef.current = 0;
      onGroundFlakesChange(0);
      speedRef.current = 2;
      spawnIntervalRef.current = 1000;
      lastSpawnRef.current = Date.now();
      lastSpeedIncreaseRef.current = 0;
      currentLevelRef.current = 1;
      pendingLevelRef.current = 1;
      onLevelChange(1);
    }
  }, [gameActive, onGroundFlakesChange, onLevelChange]);

  // Prevent scrolling on mobile
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="game-area">
      {snowflakes.map((flake) => (
        <Snowflake
          key={flake.id}
          id={flake.id}
          x={flake.x}
          y={flake.y}
          onGround={flake.onGround}
          type={flake.type}
          onCatch={catchSnowflake}
          random={flake.random}
        />
      ))}
    </div>
  );
}

export default GameArea;

