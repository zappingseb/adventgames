import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  LEVELS,
  GRAVITY,
  JUMP_STRENGTH,
  COLUMN_X_POSITIONS,
  RUNNER_WIDTH,
  RUNNER_HEIGHT,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD,
} from '../../constants/livHeroJumperConstants';
import './LivHeroJumperGame.css';

// Module-level variable to persist cumulative distance across component unmounts/remounts
let globalCumulativeDistance = 0;

interface Gap {
  id: number;
  y: number;
  width: number;
  column: number; // 0 = left, 1 = middle, 2 = right
}

interface LivHeroJumperGameProps {
  level: number;
  gameActive: boolean;
  onScoreChange: (score: number) => void;
  onLoseLife: () => void;
  onLevelComplete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  resetCumulativeDistance?: boolean; // Flag to reset cumulative distance when starting new game
}

const LivHeroJumperGame = forwardRef<
  {
    handleMoveLeft: () => void;
    handleMoveRight: () => void;
    handleJump: () => void;
  },
  LivHeroJumperGameProps
>(
  (
    {
      level,
      gameActive,
      onScoreChange,
      onLoseLife,
      onLevelComplete,
      resetCumulativeDistance = false,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const runnerImageRef = useRef<HTMLImageElement | null>(null);

    const [canvasSize, setCanvasSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight - 100,
    });

    // Game state refs
    const currentColumnRef = useRef<number>(1); // Start in middle column
    const runnerYRef = useRef<number>(window.innerHeight - 200);
    const runnerVelocityRef = useRef<number>(0);
    const isJumpingRef = useRef<boolean>(false);
    const distanceTraveledRef = useRef<number>(0);
    // Use module-level variable for cumulative distance to persist across unmounts
    const gapsRef = useRef<Gap[]>([]);
    const lastGapSpawnRef = useRef<number>(0);
    const gapIdCounterRef = useRef<number>(0);
    const levelConfigRef = useRef(LEVELS[level - 1]);
    const collisionProcessedRef = useRef<Set<number>>(new Set());

    // Swipe detection refs
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
      null,
    );

    useEffect(() => {
      const handleResize = () => {
        setCanvasSize({
          width: window.innerWidth,
          height: window.innerHeight - 100,
        });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load runner image
    useEffect(() => {
      const img = new window.Image();
      img.src = '/runner/runner.png';
      img.onload = () => {
        runnerImageRef.current = img;
      };
      img.onerror = () => {
        // eslint-disable-next-line no-console
        console.warn('Failed to load runner image');
      };
    }, []);

    // Update level config when level changes
    useEffect(() => {
      levelConfigRef.current = LEVELS[level - 1];
    }, [level]);

    // Reset cumulative distance when starting a new game (only when explicitly requested)
    useEffect(() => {
      if (resetCumulativeDistance) {
        globalCumulativeDistance = 0;
      }
    }, [resetCumulativeDistance]);

    const CANVAS_WIDTH = canvasSize.width;
    const CANVAS_HEIGHT = canvasSize.height;
    const GROUND_Y = CANVAS_HEIGHT - 50;

    // Handle button controls - internal handlers that don't call parent callbacks
    const handleMoveLeft = useCallback(() => {
      if (gameActive && currentColumnRef.current > 0) {
        currentColumnRef.current -= 1;
      }
    }, [gameActive]);

    const handleMoveRight = useCallback(() => {
      if (gameActive && currentColumnRef.current < 2) {
        currentColumnRef.current += 1;
      }
    }, [gameActive]);

    const handleJump = useCallback(() => {
      if (gameActive) {
        const groundY = canvasSize.height - 50;
        // Allow jump if on ground or close to ground
        if (runnerYRef.current >= groundY - RUNNER_HEIGHT - 5) {
          // On ground, can jump
          runnerVelocityRef.current = JUMP_STRENGTH;
          isJumpingRef.current = true;
        } else {
          // In air, can still jump (double jump)
          runnerVelocityRef.current = JUMP_STRENGTH;
        }
      }
    }, [gameActive, canvasSize.height]);

    // Swipe detection
    const handleTouchStart = useCallback(
      (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!gameActive) return;
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
      },
      [gameActive],
    );

    const handleTouchEnd = useCallback(
      (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!gameActive || !touchStartRef.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;
        const velocityX = Math.abs(deltaX) / deltaTime;
        const velocityY = Math.abs(deltaY) / deltaTime;

        // Check for horizontal swipe
        if (
          Math.abs(deltaX) > SWIPE_THRESHOLD &&
          velocityX > SWIPE_VELOCITY_THRESHOLD
        ) {
          if (deltaX > 0) {
            handleMoveRight();
          } else {
            handleMoveLeft();
          }
        }
        // Check for vertical swipe (up = jump)
        else if (
          deltaY < -SWIPE_THRESHOLD &&
          velocityY > SWIPE_VELOCITY_THRESHOLD
        ) {
          handleJump();
        }

        touchStartRef.current = null;
      },
      [gameActive, handleMoveLeft, handleMoveRight, handleJump],
    );

    // Mouse swipe simulation for desktop
    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!gameActive) return;
        touchStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now(),
        };
      },
      [gameActive],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!gameActive || !touchStartRef.current) return;

        const deltaX = e.clientX - touchStartRef.current.x;
        const deltaY = e.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;
        const velocityX = Math.abs(deltaX) / deltaTime;
        const velocityY = Math.abs(deltaY) / deltaTime;

        if (
          Math.abs(deltaX) > SWIPE_THRESHOLD &&
          velocityX > SWIPE_VELOCITY_THRESHOLD
        ) {
          if (deltaX > 0) {
            handleMoveRight();
          } else {
            handleMoveLeft();
          }
        } else if (
          deltaY < -SWIPE_THRESHOLD &&
          velocityY > SWIPE_VELOCITY_THRESHOLD
        ) {
          handleJump();
        }

        touchStartRef.current = null;
      },
      [gameActive, handleMoveLeft, handleMoveRight, handleJump],
    );

    // Game loop
    useEffect(() => {
      if (!gameActive || !canvasRef.current) {
        // Reset game state when not active (but keep cumulative distance for score continuity)
        distanceTraveledRef.current = 0;
        gapsRef.current = [];
        lastGapSpawnRef.current = 0;
        runnerYRef.current = GROUND_Y - RUNNER_HEIGHT;
        runnerVelocityRef.current = 0;
        isJumpingRef.current = false;
        currentColumnRef.current = 1;
        collisionProcessedRef.current.clear();
        // Only reset cumulative distance when game is completely stopped (not between levels)
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const config = levelConfigRef.current;

      // Reset per-level state for new level (but keep cumulative distance for score)
      distanceTraveledRef.current = 0;
      gapsRef.current = [];
      lastGapSpawnRef.current = Date.now();
      runnerYRef.current = GROUND_Y - RUNNER_HEIGHT;
      runnerVelocityRef.current = 0;
      isJumpingRef.current = false;
      currentColumnRef.current = 1;
      collisionProcessedRef.current.clear();

      const gameLoop = () => {
        if (!gameActive) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          return;
        }

        // Update runner physics
        runnerVelocityRef.current += GRAVITY;
        runnerYRef.current += runnerVelocityRef.current;

        // Ground collision
        if (runnerYRef.current >= GROUND_Y - RUNNER_HEIGHT) {
          runnerYRef.current = GROUND_Y - RUNNER_HEIGHT;
          runnerVelocityRef.current = 0;
          isJumpingRef.current = false;
        }

        // Update distance traveled (per level)
        distanceTraveledRef.current += config.scrollSpeed;
        // Update cumulative distance (across all levels) - using module-level variable
        globalCumulativeDistance += config.scrollSpeed;

        // Spawn gaps - only if last gap is far enough away
        const now = Date.now();
        const lastGap = gapsRef.current[gapsRef.current.length - 1];
        const shouldSpawn = !lastGap || lastGap.y > config.gapSpacing;

        if (
          shouldSpawn &&
          now - lastGapSpawnRef.current > config.gapFrequency
        ) {
          const gapWidth =
            config.gapWidthRange.min +
            Math.random() *
              (config.gapWidthRange.max - config.gapWidthRange.min);
          const column = Math.floor(Math.random() * 3);

          gapsRef.current.push({
            id: gapIdCounterRef.current++,
            y: -gapWidth,
            width: gapWidth,
            column,
          });
          lastGapSpawnRef.current = now;
        }

        // Update gaps and check collisions
        gapsRef.current = gapsRef.current.map((gap) => {
          // eslint-disable-next-line no-param-reassign
          gap.y += config.scrollSpeed;

          // Check collision: runner loses life if they are in the same column as the gap
          // and the gap passes through the ground level where the runner stands
          const gapTop = gap.y;
          const gapBottom = gap.y + gap.width;

          // Runner is on the ground (or very close to it)
          const runnerBottomY = runnerYRef.current + RUNNER_HEIGHT;
          const isOnGround = runnerBottomY >= GROUND_Y - 5;

          // Gap is at ground level (passing through where runner stands)
          // The gap should overlap with the ground level
          const gapAtGroundLevel = gapTop <= GROUND_Y && gapBottom >= GROUND_Y;

          // Check if runner is in the same column as the gap
          const sameColumn = currentColumnRef.current === gap.column;

          if (
            sameColumn &&
            isOnGround &&
            gapAtGroundLevel &&
            !collisionProcessedRef.current.has(gap.id)
          ) {
            // Collision detected - runner falls into gap
            collisionProcessedRef.current.add(gap.id);
            onLoseLife();
            return gap;
          }

          return gap;
        });

        // Remove gaps that are off screen
        gapsRef.current = gapsRef.current.filter(
          (gap) => gap.y < CANVAS_HEIGHT + 100,
        );

        // Check level completion
        if (distanceTraveledRef.current >= config.levelLength) {
          onLevelComplete();
          return;
        }

        // Update score based on cumulative distance (continues across levels)
        onScoreChange(Math.floor(globalCumulativeDistance / 10));

        // Draw
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw background - grey
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw ground
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 5);

        // Draw column indicators
        COLUMN_X_POSITIONS.forEach((xPos, index) => {
          const x = CANVAS_WIDTH * xPos;
          ctx.strokeStyle =
            index === currentColumnRef.current ? '#FFD700' : '#CCCCCC';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, GROUND_Y);
          ctx.stroke();
        });

        // Draw gaps - black holes
        gapsRef.current.forEach((gap) => {
          const gapColumnX = CANVAS_WIDTH * COLUMN_X_POSITIONS[gap.column];
          ctx.fillStyle = '#000000';
          ctx.fillRect(gapColumnX - 30, gap.y, 60, gap.width - 50);
        });

        // Draw runner
        const runnerDrawX =
          CANVAS_WIDTH * COLUMN_X_POSITIONS[currentColumnRef.current] -
          RUNNER_WIDTH / 2;
        if (runnerImageRef.current) {
          ctx.drawImage(
            runnerImageRef.current,
            runnerDrawX,
            runnerYRef.current,
            RUNNER_WIDTH,
            RUNNER_HEIGHT,
          );
        } else {
          // Fallback rectangle if image not loaded
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(
            runnerDrawX,
            runnerYRef.current,
            RUNNER_WIDTH,
            RUNNER_HEIGHT,
          );
        }

        animationFrameRef.current = window.requestAnimationFrame(gameLoop);
      };

      animationFrameRef.current = window.requestAnimationFrame(gameLoop);

      return () => {
        if (animationFrameRef.current) {
          window.cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [
      gameActive,
      level,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      GROUND_Y,
      onScoreChange,
      onLoseLife,
      onLevelComplete,
    ]);

    // Expose handlers to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        handleMoveLeft,
        handleMoveRight,
        handleJump,
      }),
      [handleMoveLeft, handleMoveRight, handleJump],
    );

    return (
      <div className="liv-hero-jumper-game">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="liv-jumper-canvas"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
      </div>
    );
  },
);

LivHeroJumperGame.displayName = 'LivHeroJumperGame';

export default LivHeroJumperGame;

