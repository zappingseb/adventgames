export const GRAVITY = 0.5;
export const JUMP_STRENGTH = -8;
export const OBSTACLE_SPEED = 3;
export const OBSTACLE_GAP = 150;
export const OBSTACLE_SPACING = 300;
export const SPEED_INCREASE_INTERVAL = 10000; // 10 seconds in milliseconds
export const SPEED_INCREASE_RATE = 0.1; // 10% increase

export interface Character {
  id: string;
  name: string;
  emoji: string;
  obstacle: string;
}

export const CHARACTERS: Character[] = [
  { id: 'liv', name: 'Liv', emoji: '💃', obstacle: '🖱️' },
  { id: 'sebastian', name: 'Sebastian', emoji: '🤦', obstacle: '🖨️' },
  { id: 'flora', name: 'Flora', emoji: '👧', obstacle: '🛝' },
  { id: 'magalie', name: 'Magalie', emoji: '👧🏻', obstacle: '🐕' },
];

