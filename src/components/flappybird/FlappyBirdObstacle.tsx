import { Character } from '../../constants/flappyBirdConstants';

export interface Obstacle {
  id: number;
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface FlappyBirdObstacleProps {
  obstacle: Obstacle;
  character: Character;
  canvasHeight: number;
  obstacleWidth: number;
  ctx: CanvasRenderingContext2D;
  isBlinking: boolean;
}

export function drawObstacle({
  obstacle,
  character,
  canvasHeight,
  obstacleWidth,
  ctx,
  isBlinking,
}: FlappyBirdObstacleProps) {
  // Apply flicker effect if obstacle is blinking (simulating .blink_me CSS class)
  // Use a simple toggle - if blinking, alternate between visible and invisible
  if (isBlinking) {
    // This will be toggled by the interval in the parent component
    // We'll use a timestamp-based approach for smooth animation
    const blinkState = Math.floor(Date.now() / 100) % 2; // Toggle every 100ms
    ctx.globalAlpha = blinkState === 0 ? 0 : 1; // 50% of time invisible, 50% visible
  } else {
    ctx.globalAlpha = 1.0; // Normal opacity
  }

  ctx.fillStyle = '#1a1a2e'; // Dark blue
  // Top obstacle
  ctx.fillRect(obstacle.x, 0, obstacleWidth, obstacle.topHeight);
  // Bottom obstacle
  ctx.fillRect(
    obstacle.x,
    obstacle.bottomY,
    obstacleWidth,
    canvasHeight - obstacle.bottomY
  );

  // Draw obstacle emoji
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    character.obstacle,
    obstacle.x + obstacleWidth / 2,
    obstacle.topHeight / 2
  );
  ctx.fillText(
    character.obstacle,
    obstacle.x + obstacleWidth / 2,
    obstacle.bottomY + (canvasHeight - obstacle.bottomY) / 2
  );

  // Reset alpha for next draw
  ctx.globalAlpha = 1.0;
}

