import { useEffect, useRef, useState, useCallback } from 'react';
import { Character, GRAVITY, JUMP_STRENGTH, OBSTACLE_GAP, OBSTACLE_SPACING, SPEED_INCREASE_INTERVAL, SPEED_INCREASE_RATE } from '../../constants/flappyBirdConstants';
import './FlappyBirdGame.css';

interface Obstacle {
  id: number;
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface FlappyBirdGameProps {
  character: Character;
  gameActive: boolean;
  onScoreChange: (score: number) => void;
  onGameOver: () => void;
}

function FlappyBirdGame({ character, gameActive, onScoreChange, onGameOver }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastScoreTimeRef = useRef<number>(0);
  const lastSpeedIncreaseRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(3);
  
  const [birdY, setBirdY] = useState<number>(250);
  const [birdVelocity, setBirdVelocity] = useState<number>(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState<number>(0);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const BIRD_SIZE = 40;
  const OBSTACLE_WIDTH = 60;

  // Handle tap/click to jump
  const handleJump = useCallback(() => {
    if (gameActive) {
      setBirdVelocity(JUMP_STRENGTH);
    }
  }, [gameActive]);

  // Initialize obstacles
  useEffect(() => {
    if (gameActive && obstacles.length === 0) {
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
  }, [gameActive, obstacles.length]);

  // Game loop
  useEffect(() => {
    if (!gameActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      if (!gameActive) return;

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Update bird physics
      setBirdY((prevY) => {
        setBirdVelocity((prevVel) => {
          const newVel = prevVel + GRAVITY;
          const newY = prevY + newVel;
          
          // Check boundaries
          if (newY < 0 || newY > CANVAS_HEIGHT - BIRD_SIZE) {
            onGameOver();
            return prevVel;
          }
          
          return newVel;
        });
        return prevY;
      });

      // Update obstacles
      setObstacles((prevObstacles) => {
        const updated = prevObstacles.map((obs) => ({
          ...obs,
          x: obs.x - gameSpeedRef.current,
        }));

        // Remove off-screen obstacles and add new ones
        const visible = updated.filter((obs) => obs.x > -OBSTACLE_WIDTH);
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

      // Check collisions and score
      setObstacles((prevObstacles) => {
        const birdX = 80;
        const birdCenterY = birdY + BIRD_SIZE / 2;

        return prevObstacles.map((obs) => {
          // Check if passed obstacle
          if (!obs.passed && obs.x + OBSTACLE_WIDTH < birdX) {
            setScore((prev) => prev + 1);
            return { ...obs, passed: true };
          }

          // Check collision
          if (
            birdX < obs.x + OBSTACLE_WIDTH &&
            birdX + BIRD_SIZE > obs.x &&
            (birdCenterY < obs.topHeight || birdCenterY > obs.bottomY)
          ) {
            onGameOver();
          }

          return obs;
        });
      });

      // Increase score every second
      const now = Date.now();
      if (now - lastScoreTimeRef.current >= 1000) {
        setScore((prev) => {
          const newScore = prev + 1;
          onScoreChange(newScore);
          return newScore;
        });
        lastScoreTimeRef.current = now;
      }

      // Increase speed every 10 seconds
      if (now - lastSpeedIncreaseRef.current >= SPEED_INCREASE_INTERVAL) {
        gameSpeedRef.current = gameSpeedRef.current * (1 + SPEED_INCREASE_RATE);
        lastSpeedIncreaseRef.current = now;
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
        ctx.fillStyle = '#228B22';
        // Top obstacle
        ctx.fillRect(obs.x, 0, OBSTACLE_WIDTH, obs.topHeight);
        // Bottom obstacle
        ctx.fillRect(obs.x, obs.bottomY, OBSTACLE_WIDTH, CANVAS_HEIGHT - obs.bottomY);
        
        // Draw obstacle emoji
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(character.obstacle, obs.x + OBSTACLE_WIDTH / 2, obs.topHeight / 2);
        ctx.fillText(character.obstacle, obs.x + OBSTACLE_WIDTH / 2, obs.bottomY + (CANVAS_HEIGHT - obs.bottomY) / 2);
      });

      // Draw bird
      ctx.font = '40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(character.emoji, 80 + BIRD_SIZE / 2, birdY + BIRD_SIZE / 2);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    lastScoreTimeRef.current = Date.now();
    lastSpeedIncreaseRef.current = Date.now();
    gameSpeedRef.current = 3;
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive, birdY, birdVelocity, obstacles, character, onGameOver, onScoreChange]);

  // Reset game state
  useEffect(() => {
    if (!gameActive) {
      setBirdY(250);
      setBirdVelocity(0);
      setObstacles([]);
      setScore(0);
      gameSpeedRef.current = 3;
      lastSpeedIncreaseRef.current = 0;
      lastScoreTimeRef.current = 0;
    }
  }, [gameActive]);

  return (
    <div className="flappy-bird-game" onPointerDown={handleJump} onTouchStart={handleJump}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="flappy-canvas"
      />
    </div>
  );
}

export default FlappyBirdGame;

