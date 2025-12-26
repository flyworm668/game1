import { Point } from '../types';

/**
 * Generates a random point inside a triangle defined by p1, p2, p3.
 * Uses barycentric coordinates.
 */
export const getRandomPointInTriangle = (p1: Point, p2: Point, p3: Point): Point => {
  const r1 = Math.random();
  const r2 = Math.random();

  const sqrtR1 = Math.sqrt(r1);

  const x = (1 - sqrtR1) * p1.x + (sqrtR1 * (1 - r2)) * p2.x + (sqrtR1 * r2) * p3.x;
  const y = (1 - sqrtR1) * p1.y + (sqrtR1 * (1 - r2)) * p2.y + (sqrtR1 * r2) * p3.y;

  return { x, y };
};

/**
 * Generates a random point inside a rectangle.
 */
export const getRandomPointInRect = (x: number, y: number, w: number, h: number): Point => {
  return {
    x: x + Math.random() * w,
    y: y + Math.random() * h,
  };
};

/**
 * Generates a random point inside a star shape.
 * Simplified as a circle center for the core, then checking if point is inside star polygon.
 * For performance, we will generate points in a bounding circle and filter them.
 */
export const isPointInStar = (px: number, py: number, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): boolean => {
  const angleStep = Math.PI / spikes;
  let angle = -Math.PI / 2;
  const starPoints: Point[] = [];

  // Generate vertices
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    });
    angle += angleStep;
  }

  // Ray-casting algorithm to check if point is inside polygon
  let inside = false;
  for (let i = 0, j = starPoints.length - 1; i < starPoints.length; j = i++) {
    const xi = starPoints[i].x, yi = starPoints[i].y;
    const xj = starPoints[j].x, yj = starPoints[j].y;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};
