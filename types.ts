export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  x: number; // Current X
  y: number; // Current Y
  originX: number; // Target X (Tree shape)
  originY: number; // Target Y (Tree shape)
  vx: number; // Velocity X
  vy: number; // Velocity Y
  size: number;
  color: string;
  density: number; // Mass/Response to mouse
  friction: number;
  ease: number;
  type: 'leaf' | 'trunk' | 'star' | 'ornament' | 'trail' | 'explosion' | 'ground_light' | 'sky_star' | 'firework_rocket' | 'firework_spark' | 'user_ornament' | 'shockwave';
  life?: number; // For trail/explosion particles: 0 to 1 opacity
  decay?: number; // For trail/explosion particles: rate of decay
  // New properties
  isEdge?: boolean; // Only edge particles sway
  canSway?: boolean; // Only specific particles (e.g. 20% of inner) sway with mouse
  reactive?: boolean; // 50% chance to react to mouse
  colorTimer?: number; // Timer for ornaments changing color
  text?: string; // For floating text particles
  bounds?: { minX: number; maxX: number }; // Constraint for swaying
}

export interface TextParticle {
    x: number;
    y: number;
    text: string;
    opacity: number;
    vy: number;
    color: string;
    scale: number;
}

export interface Gift {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  ribbonColor: string;
  type: 'small' | 'medium' | 'large' | 'blue' | 'black' | 'yellow' | 'pink' | 'purple';
  speedMultiplier: number;
  baseScore: number;
  rotation: number;
  rotationSpeed: number;
}

export interface SnowFlake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
}

export interface TreeConfig {
  width: number;
  height: number;
  leafColor: string;
  trunkColor: string;
}
