import { useEffect, useRef, useState, useCallback } from 'react';
import { Character, GRAVITY, JUMP_STRENGTH, OBSTACLE_GAP, OBSTACLE_SPACING, SPEED_INCREASE_INTERVAL, SPEED_INCREASE_RATE, DEATH_BARRIERS, OBSTACLE_SPEED } from '../../constants/flappyBirdConstants';
import { drawObstacle, Obstacle } from './FlappyBirdObstacle';
import './FlappyBirdGame.css';

interface FlappyBirdGameProps {
  character: Character;
  gameActive: boolean;
  onScoreChange: (score: number) => void;
  onGameOver: () => void;
  onBarrierHit: (count: number) => void;
}

function FlappyBirdGame({ character, gameActive, onScoreChange, onGameOver, onBarrierHit }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpeedIncreaseRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(OBSTACLE_SPEED);
  const birdVelocityRef = useRef<number>(0);
  const birdYRef = useRef<number>(250);
  
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [barrierHits, setBarrierHits] = useState<number>(0);
  const [scoreHits, setScoreHits] = useState<number[]>([]);
  const collisionProcessedRef = useRef<Set<number>>(new Set());
  const hitIdsRef = useRef<Set<number>>(new Set());
  const [blinkVisible, setBlinkVisible] = useState<boolean>(true);
  const [hasHitObstacles, setHasHitObstacles] = useState<boolean>(false);

  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight - 100 });
  
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight - 100 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const BIRD_SIZE = 40;
  const OBSTACLE_WIDTH = 60;

  // Handle tap/click to jump
  const handleJump = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Try to preventDefault, but don't fail if event is passive (touch events)
    try {
      e.preventDefault();
    } catch (err) {
      // Ignore errors from passive event listeners
    }
    e.stopPropagation();
    if (gameActive) {
      birdVelocityRef.current = JUMP_STRENGTH;
    }
  }, [gameActive]);

  // Initialize obstacles when game becomes active
  useEffect(() => {
    if (gameActive) {
      if (obstacles.length === 0) {
        const initialObstacles: Obstacle[] = [];
        for (let i = 0; i < 3; i++) {
          const topHeight = Math.random() * (CANVAS_HEIGHT - OBSTACLE_GAP - 100) + 50;
          initialObstacles.push({
            id: i,
            x: CANVAS_WIDTH + i * OBSTACLE_SPACING,
            topHeight,
            bottomY: topHeight + OBSTACLE_GAP,
            passed: false,
          });
        }
        setObstacles(initialObstacles);
      }
    } else {
      // Reset obstacles when game is not active
      setObstacles([]);
      hitIdsRef.current.clear();
      setBlinkVisible(true);
    }
  }, [gameActive]);

  // Calculate score: count obstacles that have passed
  useEffect(() => {
    if (!gameActive) return;
    const passedCount = obstacles.filter(obs => obs.passed && !scoreHits.includes(obs.id)).length;
    setScoreHits(obstacles.filter(obs => obs.passed).map(obs => obs.id));
    onScoreChange(passedCount);
  }, [obstacles, gameActive, onScoreChange]);

  // Blinking interval for hit obstacles (simulating .blink_me CSS class)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (gameActive && hasHitObstacles) {
      intervalId = setInterval(() => {
        setBlinkVisible((v) => !v); // Toggle visibility every 100ms
      }, 100); // Toggle every 100ms (200ms total cycle = 100ms visible, 100ms invisible)
    } else {
      setBlinkVisible(true); // Show normally when not blinking
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameActive, hasHitObstacles]);

  // Game loop
  useEffect(() => {
    if (!gameActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      if (!gameActive) return;

      lastTimeRef.current = currentTime;

      // Update bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current += birdVelocityRef.current;
      
      // Check boundaries
      if (birdYRef.current < 0 || birdYRef.current > CANVAS_HEIGHT - BIRD_SIZE) {
        setBarrierHits((prev) => {
          const newHits = prev + 1;
          setTimeout(() => {
            onBarrierHit(newHits);
            if (newHits >= DEATH_BARRIERS) {
              onGameOver();
            }
          }, 0);
          return newHits;
        });
        birdYRef.current = Math.max(0, Math.min(CANVAS_HEIGHT - BIRD_SIZE, birdYRef.current));
      }

      // Update obstacles and check collisions
      const birdX = 80;
      const birdCenterY = birdYRef.current + BIRD_SIZE / 2;
      const birdRightEdge = birdX + BIRD_SIZE;

      setObstacles((prevObstacles) => {
        // Create a map of previous positions for quick lookup
        const prevPositions = new Map(prevObstacles.map(obs => [obs.id, obs.x]));
        
        // First, move obstacles
        const updated = prevObstacles.map((obs) => ({
          ...obs,
          x: obs.x - gameSpeedRef.current,
        }));

        // Then check collisions and mark obstacles as passed
        const withCollisions = updated.map((obs) => {
          // Mark obstacle as passed if it has crossed the bird's right edge
          if (!obs.passed) {
            const prevX = prevPositions.get(obs.id) ?? obs.x + gameSpeedRef.current;
            const prevRightEdge = prevX + OBSTACLE_WIDTH;
            const currentRightEdge = obs.x + OBSTACLE_WIDTH;
            
            // Check if obstacle crossed the threshold this frame, or is already behind
            const justCrossed = prevRightEdge >= birdRightEdge && currentRightEdge < birdRightEdge;
            const alreadyPassed = currentRightEdge < birdRightEdge;
            
            if (justCrossed || alreadyPassed) {
              return { ...obs, passed: true };
            }
          }

          // Check collision
          if (
            birdX < obs.x + OBSTACLE_WIDTH &&
            birdX + BIRD_SIZE > obs.x &&
            (birdCenterY < obs.topHeight || birdCenterY > obs.bottomY) &&
            !collisionProcessedRef.current.has(obs.id)
          ) {
            collisionProcessedRef.current.add(obs.id);
            
            // Add obstacle to hit_ids set for blinking
            hitIdsRef.current.add(obs.id);
            setHasHitObstacles(true);
            
            // Remove from hit_ids after 200ms
            setTimeout(() => {
              hitIdsRef.current.delete(obs.id);
              if (hitIdsRef.current.size === 0) {
                setHasHitObstacles(false);
              }
            }, 200);
            
            setBarrierHits((prev) => {
              const newHits = prev + 1;
              // Defer parent update to avoid React warning
              setTimeout(() => {
                onBarrierHit(newHits);
                if (newHits >= DEATH_BARRIERS) {
                  onGameOver();
                }
              }, 0);
              return newHits;
            });
          }

          return obs;
        });

        // Remove off-screen obstacles and add new ones
        const visible = withCollisions.filter((obs) => obs.x > -OBSTACLE_WIDTH);
        const lastObstacle = visible[visible.length - 1];
        
        if (lastObstacle && lastObstacle.x < CANVAS_WIDTH - OBSTACLE_SPACING) {
          const topHeight = Math.random() * (CANVAS_HEIGHT - OBSTACLE_GAP - 100) + 50;
          visible.push({
            id: Date.now(),
            x: CANVAS_WIDTH,
            topHeight,
            bottomY: topHeight + OBSTACLE_GAP,
            passed: false,
          });
        }

        return visible;
      });

      console.log('currentTime', currentTime);
      console.log('lastSpeedIncreaseRef.current', lastSpeedIncreaseRef.current);

      // Increase speed every 10 seconds (using currentTime from requestAnimationFrame)
      if (lastSpeedIncreaseRef.current === 0) {
        // Initialize on first frame - use currentTime as baseline
        lastSpeedIncreaseRef.current = currentTime;
        console.log('Initialized lastSpeedIncreaseRef to:', currentTime);
      } else {
        // Only check and update if we've already initialized
        const timeSinceLastIncrease = currentTime - lastSpeedIncreaseRef.current;
        if (timeSinceLastIncrease >= SPEED_INCREASE_INTERVAL) {
          gameSpeedRef.current = gameSpeedRef.current * (1 + SPEED_INCREASE_RATE);
          lastSpeedIncreaseRef.current = currentTime;
          console.log('Updated lastSpeedIncreaseRef to:', currentTime, 'new speed:', gameSpeedRef.current);
        }
      }

      // Draw
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw background
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw ground
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 5);

      // Draw obstacles
      obstacles.forEach((obs) => {
        const isInHitIds = hitIdsRef.current.has(obs.id);
        drawObstacle({
          obstacle: obs,
          character,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          obstacleWidth: OBSTACLE_WIDTH,
          ctx,
          isBlinking: isInHitIds && !blinkVisible, // Blink when in hit_ids and blinkVisible is false
        });
      });

      // Draw bird
      ctx.font = '40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(character.emoji, 80 + BIRD_SIZE / 2, birdYRef.current + BIRD_SIZE / 2);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    // Don't reset lastSpeedIncreaseRef here - only reset it when game becomes inactive
    gameSpeedRef.current = OBSTACLE_SPEED;
    onScoreChange(0);
      animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive, character, onGameOver, onScoreChange, onBarrierHit, blinkVisible]);

  // Reset game state
  useEffect(() => {
    if (!gameActive) {
      birdYRef.current = 250;
      birdVelocityRef.current = 0;
      setObstacles([]);
      onScoreChange(0);
      setBarrierHits(0);
      collisionProcessedRef.current.clear();
      hitIdsRef.current.clear();
      setBlinkVisible(true);
      setHasHitObstacles(false);
      gameSpeedRef.current = OBSTACLE_SPEED;
      lastSpeedIncreaseRef.current = 0;
    }
  }, [gameActive, onScoreChange]);

  return (
    <div className="flappy-bird-game">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="flappy-canvas"
        onPointerDown={handleJump}
        onTouchStart={handleJump}
      />
    </div>
  );
}

export default FlappyBirdGame;

