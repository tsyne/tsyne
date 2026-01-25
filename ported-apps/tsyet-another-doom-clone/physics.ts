import { Vector3, rayLineIntersect2DV, angleBetweenYForward } from 'cosyne';
import { GameMap } from './game-map';

// ============================================================================
// Constants
// ============================================================================

export const ZERO = Vector3.zero();
export const X_DIR = Vector3.right();
export const Y_DIR = Vector3.up();
export const Z_DIR = Vector3.forward();

// ============================================================================
// Vector3 Helper Functions
// ============================================================================

/**
 * Angle from point a looking away from point b (original doom clone convention)
 * This is the negation of angleBetweenYForward.
 */
export function angleBetween(a: Vector3, b: Vector3): number {
  return -angleBetweenYForward(a, b);
}

/**
 * Wrapper around cosyne's rayLineIntersect2DV that returns tuple instead of object
 */
export function rayLineIntersect(
  origin: Vector3,
  dir: Vector3,
  p1: Vector3,
  p2: Vector3
): [number, number] | null {
  const result = rayLineIntersect2DV(origin, dir, p1, p2);
  if (result === null) return null;
  return [result.t, result.u];
}

// ============================================================================
// Wall Collision Detection (8 Rays)
// ============================================================================

/**
 * Check collision using 8 rays cast from player position
 * Returns adjusted position that doesn't collide with walls
 */
export function checkWallCollision(
  position: Vector3,
  newPosition: Vector3,
  map: GameMap,
  collisionRadius: number = 4
): Vector3 {
  const desiredFloor = map.getFloorHeight(newPosition);
  if (desiredFloor < -50) {
    return position.clone();
  }

  const numRays = 8;
  let adjustedPos = newPosition.clone();

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    const rayDir = new Vector3(Math.cos(angle), Math.sin(angle), 0);

    for (const wall of map.walls) {
      const hit = rayLineIntersect(
        new Vector3(adjustedPos.x, adjustedPos.y, 0),
        rayDir,
        wall.p1,
        wall.p2
      );

      if (hit && hit[0] > 0 && hit[0] < collisionRadius) {
        const pushBack = collisionRadius - hit[0];
        const pushVec = rayDir.multiplyScalar(pushBack);
        const testPos = adjustedPos.sub(pushVec);

        const testFloor = map.getFloorHeight(testPos);
        if (testFloor > -50) {
          adjustedPos = testPos;
        }
      }
    }
  }

  return adjustedPos;
}
