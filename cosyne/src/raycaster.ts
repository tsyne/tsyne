/**
 * Raycaster - 2.5D Software Rendering Engine
 *
 * A reusable 2.5D raycasting renderer for classic DOOM/Wolfenstein-style
 * first-person games. Renders to a pixel buffer suitable for TappableCanvasRaster.
 *
 * Unlike true 3D rendering, raycasting works by:
 * 1. Casting one ray per screen column from the camera
 * 2. Finding the nearest wall intersection
 * 3. Drawing a vertical stripe whose height is inversely proportional to distance
 * 4. Using a depth buffer to correctly sort sprites
 */

import { Vector3, clamp, lerp } from './math3d';

/**
 * Configuration options for the raycaster
 */
export interface RaycasterConfig {
  /** Field of view in radians (default: Math.PI / 3 = 60 degrees) */
  fov?: number;

  /** Maximum render distance (default: 200) */
  maxDistance?: number;

  /** Enable floor/ceiling rendering (default: true) */
  renderFloorCeiling?: boolean;

  /** Enable distance fog (default: true) */
  enableFog?: boolean;

  /** Fog density 0-1 (default: 0.5) */
  fogDensity?: number;

  /** Ceiling color [r, g, b] */
  ceilingColor?: [number, number, number];

  /** Floor color [r, g, b] */
  floorColor?: [number, number, number];

  /** Fog color [r, g, b] (default: black) */
  fogColor?: [number, number, number];
}

/**
 * A wall segment in the raycaster scene
 */
export interface RaycasterWall {
  /** Start point of wall segment (XY plane - z is typically 0) */
  p1: Vector3;

  /** End point of wall segment (XY plane - z is typically 0) */
  p2: Vector3;

  /** Floor height at this wall */
  floorHeight: number;

  /** Ceiling height at this wall */
  ceilingHeight: number;

  /** Wall color [r, g, b] or texture ID */
  color: [number, number, number] | number;

  /** Is this wall solid for collision? (default: true) */
  solid?: boolean;

  /** Optional: different color for opposite side */
  backColor?: [number, number, number];
}

/**
 * A sprite (billboard) in the raycaster scene
 */
export interface RaycasterSprite {
  /** World position */
  position: Vector3;

  /** Sprite width in world units */
  width: number;

  /** Sprite height in world units */
  height: number;

  /** Color [r, g, b] or texture ID */
  color: [number, number, number] | number;

  /** Optional alpha 0-1 */
  alpha?: number;

  /** Optional: vertical offset from floor */
  zOffset?: number;

  /** Optional: always face camera (billboard) - default true */
  billboard?: boolean;
}

/**
 * Camera state for the raycaster
 */
export interface RaycasterCamera {
  /** Camera position in world space (x, y on the floor plane, z typically 0) */
  position: Vector3;

  /** Horizontal rotation angle (radians) - 0 faces +X, PI/2 faces +Y */
  angle: number;

  /** Vertical look angle (radians) - for looking up/down */
  pitch?: number;

  /** Camera height above floor */
  height: number;
}

/**
 * Information about a ray intersection with a wall
 */
export interface RaycastHit {
  /** Distance from ray origin to hit point */
  distance: number;

  /** World position of hit */
  point: Vector3;

  /** Position along wall segment [0, 1] */
  wallU: number;

  /** The wall that was hit */
  wall: RaycasterWall;

  /** Surface normal at hit point */
  normal: Vector3;

  /** Which side of wall was hit (0 or 1) */
  side: number;
}

/**
 * Movement result from collision detection
 */
export interface MoveResult {
  /** Whether the move is possible */
  canMove: boolean;

  /** Adjusted position after collision response */
  adjustedPosition?: Vector3;

  /** The wall that was hit (if any) */
  hitWall?: RaycasterWall;
}

/**
 * 2.5D Raycaster Engine
 *
 * Renders DOOM/Wolfenstein-style first-person views to a pixel buffer.
 */
export class Raycaster {
  private width: number;
  private height: number;
  private depthBuffer: Float32Array;

  // Configuration
  private fov: number = Math.PI / 3; // 60 degrees
  private maxDistance: number = 200;
  private renderFloorCeiling: boolean = true;
  private enableFog: boolean = true;
  private fogDensity: number = 0.5;
  private ceilingColor: [number, number, number] = [30, 30, 40];
  private floorColor: [number, number, number] = [50, 50, 60];
  private fogColor: [number, number, number] = [0, 0, 0];

  constructor(width: number, height: number, config?: RaycasterConfig) {
    this.width = width;
    this.height = height;
    this.depthBuffer = new Float32Array(width);

    if (config) {
      this.configure(config);
    }
  }

  /**
   * Resize the render buffer
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.depthBuffer = new Float32Array(width);
  }

  /**
   * Update configuration
   */
  configure(config: Partial<RaycasterConfig>): void {
    if (config.fov !== undefined) this.fov = config.fov;
    if (config.maxDistance !== undefined) this.maxDistance = config.maxDistance;
    if (config.renderFloorCeiling !== undefined) this.renderFloorCeiling = config.renderFloorCeiling;
    if (config.enableFog !== undefined) this.enableFog = config.enableFog;
    if (config.fogDensity !== undefined) this.fogDensity = config.fogDensity;
    if (config.ceilingColor !== undefined) this.ceilingColor = config.ceilingColor;
    if (config.floorColor !== undefined) this.floorColor = config.floorColor;
    if (config.fogColor !== undefined) this.fogColor = config.fogColor;
  }

  /**
   * Get current width
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Get current height
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Render the scene to a pixel buffer
   *
   * @param buffer - RGBA Uint8Array (width * height * 4 bytes)
   * @param camera - Camera position and orientation
   * @param walls - Array of wall segments to render
   * @param sprites - Array of sprites to render
   */
  render(
    buffer: Uint8Array,
    camera: RaycasterCamera,
    walls: RaycasterWall[],
    sprites?: RaycasterSprite[]
  ): void {
    // 1. Clear buffer with floor/ceiling colors
    this.clearBuffer(buffer, camera);

    // 2. Reset depth buffer
    this.depthBuffer.fill(this.maxDistance);

    // 3. Render walls (one ray per column)
    this.renderWalls(buffer, camera, walls);

    // 4. Render sprites (sorted back-to-front)
    if (sprites && sprites.length > 0) {
      this.renderSprites(buffer, camera, sprites);
    }
  }

  /**
   * Cast a single ray and return hit information
   * Useful for collision detection, shooting, etc.
   */
  castRay(
    origin: Vector3,
    angle: number,
    walls: RaycasterWall[]
  ): RaycastHit | null {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    let closestHit: RaycastHit | null = null;
    let closestDistance = this.maxDistance;

    for (const wall of walls) {
      const hit = this.rayLineIntersect(
        origin.x, origin.y,
        dirX, dirY,
        wall.p1.x, wall.p1.y,
        wall.p2.x, wall.p2.y
      );

      if (hit && hit.distance < closestDistance && hit.distance > 0.001) {
        closestDistance = hit.distance;

        // Calculate wall normal
        const wallDx = wall.p2.x - wall.p1.x;
        const wallDy = wall.p2.y - wall.p1.y;
        const wallLen = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

        // Normal perpendicular to wall
        let normalX = -wallDy / wallLen;
        let normalY = wallDx / wallLen;

        // Determine which side we hit (0 = front, 1 = back)
        const side = (dirX * normalX + dirY * normalY) > 0 ? 1 : 0;
        if (side === 1) {
          normalX = -normalX;
          normalY = -normalY;
        }

        closestHit = {
          distance: hit.distance,
          point: new Vector3(
            origin.x + dirX * hit.distance,
            origin.y + dirY * hit.distance,
            0
          ),
          wallU: hit.u,
          wall,
          normal: new Vector3(normalX, normalY, 0),
          side,
        };
      }
    }

    return closestHit;
  }

  /**
   * Get the depth buffer after rendering
   * Useful for custom sprite rendering or effects
   */
  getDepthBuffer(): Float32Array {
    return this.depthBuffer;
  }

  /**
   * Screen-to-world ray for mouse picking
   */
  screenToRay(screenX: number, camera: RaycasterCamera): { origin: Vector3; direction: Vector3 } {
    // Calculate ray angle for this screen column
    const rayAngle = camera.angle + this.fov / 2 - (screenX / this.width) * this.fov;

    return {
      origin: camera.position.clone(),
      direction: new Vector3(Math.cos(rayAngle), Math.sin(rayAngle), 0),
    };
  }

  /**
   * Check if a circle can move from current position to target
   * Returns move result with collision information
   */
  canMove(
    from: Vector3,
    to: Vector3,
    radius: number,
    walls: RaycasterWall[]
  ): MoveResult {
    // Check collision with each solid wall
    for (const wall of walls) {
      if (wall.solid === false) continue;

      // Check if circle at 'to' position intersects with wall segment
      const dist = this.pointToLineSegmentDistance(
        to.x, to.y,
        wall.p1.x, wall.p1.y,
        wall.p2.x, wall.p2.y
      );

      if (dist < radius) {
        // Collision detected - calculate slide response
        const adjusted = this.calculateSlideResponse(from, to, wall, radius);

        return {
          canMove: false,
          adjustedPosition: adjusted,
          hitWall: wall,
        };
      }
    }

    return { canMove: true };
  }

  // ==================== Private Methods ====================

  /**
   * Clear the buffer with floor and ceiling colors
   */
  private clearBuffer(buffer: Uint8Array, camera: RaycasterCamera): void {
    const halfHeight = Math.floor(this.height / 2);
    const pitch = camera.pitch || 0;
    const pitchOffset = Math.floor(pitch * this.height * 0.5);
    const horizonY = halfHeight + pitchOffset;

    for (let y = 0; y < this.height; y++) {
      let r: number, g: number, b: number;

      if (this.renderFloorCeiling) {
        if (y < horizonY) {
          // Ceiling
          [r, g, b] = this.ceilingColor;
        } else {
          // Floor
          [r, g, b] = this.floorColor;
        }
      } else {
        // Just use ceiling color for whole background
        [r, g, b] = this.ceilingColor;
      }

      for (let x = 0; x < this.width; x++) {
        const offset = (y * this.width + x) * 4;
        buffer[offset] = r;
        buffer[offset + 1] = g;
        buffer[offset + 2] = b;
        buffer[offset + 3] = 255;
      }
    }
  }

  /**
   * Render all walls by casting rays
   */
  private renderWalls(
    buffer: Uint8Array,
    camera: RaycasterCamera,
    walls: RaycasterWall[]
  ): void {
    for (let x = 0; x < this.width; x++) {
      // Calculate ray angle for this column
      const rayScreenPos = (x / this.width) - 0.5; // -0.5 to 0.5
      const rayAngle = camera.angle + rayScreenPos * this.fov;

      // Cast ray
      const hit = this.castRay(camera.position, rayAngle, walls);

      if (hit) {
        // Fisheye correction: use perpendicular distance
        const perpDist = hit.distance * Math.cos(rayAngle - camera.angle);

        // Store in depth buffer
        this.depthBuffer[x] = perpDist;

        // Draw wall stripe
        this.drawWallStripe(buffer, x, perpDist, hit, camera);
      }
    }
  }

  /**
   * Draw a single vertical wall stripe
   */
  private drawWallStripe(
    buffer: Uint8Array,
    x: number,
    perpDist: number,
    hit: RaycastHit,
    camera: RaycasterCamera
  ): void {
    const wall = hit.wall;

    // Calculate wall height on screen
    const wallHeight = wall.ceilingHeight - wall.floorHeight;
    const scaleFactor = this.height / perpDist;
    const screenWallHeight = wallHeight * scaleFactor;

    // Calculate vertical position (accounting for camera height and pitch)
    const pitch = camera.pitch || 0;
    const pitchOffset = pitch * this.height * 0.5;
    const cameraHeightOffset = (camera.height - wall.floorHeight) * scaleFactor;

    const screenCenterY = this.height / 2 + pitchOffset;
    const drawStart = Math.floor(screenCenterY - cameraHeightOffset);
    const drawEnd = Math.floor(drawStart + screenWallHeight);

    // Clamp to screen bounds
    const yStart = Math.max(0, drawStart);
    const yEnd = Math.min(this.height - 1, drawEnd);

    // Get wall color
    let wallColor: [number, number, number];
    if (typeof wall.color === 'number') {
      // Texture ID - for now just use gray
      wallColor = [128, 128, 128];
    } else {
      wallColor = hit.side === 1 && wall.backColor ? wall.backColor : wall.color;
    }

    // Apply shading based on side (darker for perpendicular walls)
    const sideShade = hit.side === 0 ? 1.0 : 0.7;

    // Draw the wall stripe
    for (let y = yStart; y <= yEnd; y++) {
      // Calculate texture V coordinate (for future texture mapping)
      const texV = (y - drawStart) / screenWallHeight;

      // Apply distance-based shading
      let [r, g, b] = wallColor;
      r = Math.floor(r * sideShade);
      g = Math.floor(g * sideShade);
      b = Math.floor(b * sideShade);

      // Apply fog
      if (this.enableFog) {
        const fogFactor = this.calculateFog(perpDist);
        r = Math.floor(lerp(r, this.fogColor[0], fogFactor));
        g = Math.floor(lerp(g, this.fogColor[1], fogFactor));
        b = Math.floor(lerp(b, this.fogColor[2], fogFactor));
      }

      const offset = (y * this.width + x) * 4;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
      buffer[offset + 3] = 255;
    }
  }

  /**
   * Render all sprites
   */
  private renderSprites(
    buffer: Uint8Array,
    camera: RaycasterCamera,
    sprites: RaycasterSprite[]
  ): void {
    // Calculate distance from camera to each sprite and sort
    const spriteData: Array<{ sprite: RaycasterSprite; distance: number }> = [];

    for (const sprite of sprites) {
      const dx = sprite.position.x - camera.position.x;
      const dy = sprite.position.y - camera.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      spriteData.push({ sprite, distance });
    }

    // Sort by distance (far to near)
    spriteData.sort((a, b) => b.distance - a.distance);

    // Render each sprite
    for (const { sprite, distance } of spriteData) {
      this.renderSprite(buffer, camera, sprite, distance);
    }
  }

  /**
   * Render a single sprite
   */
  private renderSprite(
    buffer: Uint8Array,
    camera: RaycasterCamera,
    sprite: RaycasterSprite,
    distance: number
  ): void {
    // Calculate sprite position relative to camera
    const dx = sprite.position.x - camera.position.x;
    const dy = sprite.position.y - camera.position.y;

    // Transform to camera space
    // Forward direction: (cos(angle), sin(angle))
    // Right direction: (sin(angle), -cos(angle))
    const cosA = Math.cos(camera.angle);
    const sinA = Math.sin(camera.angle);
    // transformY = forward distance = dot(offset, forward)
    const transformY = dx * cosA + dy * sinA;
    // transformX = right offset = dot(offset, right)
    const transformX = dx * sinA - dy * cosA;

    // Sprite is behind camera
    if (transformY <= 0.1) return;

    // Calculate screen position
    const screenX = Math.floor((1 + transformX / transformY) * this.width / 2);

    // Calculate sprite dimensions on screen
    const scaleFactor = this.height / transformY;
    const spriteScreenWidth = Math.floor(sprite.width * scaleFactor);
    const spriteScreenHeight = Math.floor(sprite.height * scaleFactor);

    // Calculate vertical position
    const pitch = camera.pitch || 0;
    const pitchOffset = pitch * this.height * 0.5;
    const zOffset = sprite.zOffset || 0;
    const spriteZ = sprite.position.z + zOffset;
    const verticalOffset = (camera.height - spriteZ - sprite.height / 2) * scaleFactor;

    const screenY = Math.floor(this.height / 2 + pitchOffset - spriteScreenHeight / 2 + verticalOffset);

    // Calculate sprite bounds on screen
    const spriteStartX = Math.floor(screenX - spriteScreenWidth / 2);
    const spriteEndX = spriteStartX + spriteScreenWidth;
    const spriteStartY = screenY;
    const spriteEndY = screenY + spriteScreenHeight;

    // Get sprite color
    let spriteColor: [number, number, number];
    if (typeof sprite.color === 'number') {
      // Texture ID - for now use magenta
      spriteColor = [255, 0, 255];
    } else {
      spriteColor = sprite.color;
    }

    const alpha = sprite.alpha !== undefined ? sprite.alpha : 1.0;

    // Draw sprite pixels
    for (let x = Math.max(0, spriteStartX); x < Math.min(this.width, spriteEndX); x++) {
      // Check depth buffer - only draw if sprite is closer than wall
      if (transformY >= this.depthBuffer[x]) continue;

      for (let y = Math.max(0, spriteStartY); y < Math.min(this.height, spriteEndY); y++) {
        // Calculate texture coordinates
        const texU = (x - spriteStartX) / spriteScreenWidth;
        const texV = (y - spriteStartY) / spriteScreenHeight;

        // For solid color sprites, just use the color
        // For textured sprites, this would sample the texture
        let [r, g, b] = spriteColor;

        // Apply fog
        if (this.enableFog) {
          const fogFactor = this.calculateFog(transformY);
          r = Math.floor(lerp(r, this.fogColor[0], fogFactor));
          g = Math.floor(lerp(g, this.fogColor[1], fogFactor));
          b = Math.floor(lerp(b, this.fogColor[2], fogFactor));
        }

        // Apply alpha blending
        const offset = (y * this.width + x) * 4;
        if (alpha < 1.0) {
          buffer[offset] = Math.floor(r * alpha + buffer[offset] * (1 - alpha));
          buffer[offset + 1] = Math.floor(g * alpha + buffer[offset + 1] * (1 - alpha));
          buffer[offset + 2] = Math.floor(b * alpha + buffer[offset + 2] * (1 - alpha));
        } else {
          buffer[offset] = r;
          buffer[offset + 1] = g;
          buffer[offset + 2] = b;
        }
        buffer[offset + 3] = 255;
      }
    }
  }

  /**
   * Calculate fog factor based on distance
   */
  private calculateFog(distance: number): number {
    if (!this.enableFog) return 0;

    // Exponential fog
    const fogFactor = 1 - Math.exp(-this.fogDensity * distance / this.maxDistance);
    return clamp(fogFactor, 0, 1);
  }

  /**
   * Ray-line segment intersection
   * Returns null if no intersection, otherwise returns { distance, u }
   * where u is the position along the line segment [0, 1]
   */
  private rayLineIntersect(
    rayX: number, rayY: number,
    rayDirX: number, rayDirY: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): { distance: number; u: number } | null {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const denom = rayDirX * dy - rayDirY * dx;

    // Ray is parallel to line
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - rayX) * dy - (y1 - rayY) * dx) / denom;
    const u = ((x1 - rayX) * rayDirY - (y1 - rayY) * rayDirX) / denom;

    // Intersection is behind ray origin or outside line segment
    if (t < 0 || u < 0 || u > 1) return null;

    return { distance: t, u };
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Line segment is a point
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    // Project point onto line, clamping to segment
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1);

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  /**
   * Calculate slide response when colliding with a wall
   */
  private calculateSlideResponse(
    from: Vector3,
    to: Vector3,
    wall: RaycasterWall,
    radius: number
  ): Vector3 {
    // Calculate wall normal
    const wallDx = wall.p2.x - wall.p1.x;
    const wallDy = wall.p2.y - wall.p1.y;
    const wallLen = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    const normalX = -wallDy / wallLen;
    const normalY = wallDx / wallLen;

    // Calculate movement vector
    const moveX = to.x - from.x;
    const moveY = to.y - from.y;

    // Project movement onto wall tangent
    const tangentX = wallDx / wallLen;
    const tangentY = wallDy / wallLen;

    const slideAmount = moveX * tangentX + moveY * tangentY;

    // Calculate slide position
    const slideX = from.x + tangentX * slideAmount;
    const slideY = from.y + tangentY * slideAmount;

    // Push away from wall by radius
    const dist = this.pointToLineSegmentDistance(slideX, slideY, wall.p1.x, wall.p1.y, wall.p2.x, wall.p2.y);

    if (dist < radius) {
      // Determine which side of wall we're on
      const toWallX = slideX - wall.p1.x;
      const toWallY = slideY - wall.p1.y;
      const side = toWallX * normalX + toWallY * normalY;

      const pushDir = side >= 0 ? 1 : -1;
      const pushAmount = radius - dist + 0.01;

      return new Vector3(
        slideX + normalX * pushDir * pushAmount,
        slideY + normalY * pushDir * pushAmount,
        from.z
      );
    }

    return new Vector3(slideX, slideY, from.z);
  }
}

/**
 * Default configuration for the raycaster
 */
export const DEFAULT_RAYCASTER_CONFIG: RaycasterConfig = {
  fov: Math.PI / 3,
  maxDistance: 200,
  renderFloorCeiling: true,
  enableFog: true,
  fogDensity: 0.5,
  ceilingColor: [30, 30, 40],
  floorColor: [50, 50, 60],
  fogColor: [0, 0, 0],
};

/**
 * Create a simple rectangular room with walls
 */
export function createRoom(
  x: number,
  y: number,
  width: number,
  height: number,
  wallColor: [number, number, number] = [100, 100, 120],
  floorHeight: number = 0,
  ceilingHeight: number = 30
): RaycasterWall[] {
  const halfW = width / 2;
  const halfH = height / 2;

  return [
    // North wall
    {
      p1: new Vector3(x - halfW, y + halfH, 0),
      p2: new Vector3(x + halfW, y + halfH, 0),
      floorHeight,
      ceilingHeight,
      color: wallColor,
    },
    // East wall
    {
      p1: new Vector3(x + halfW, y + halfH, 0),
      p2: new Vector3(x + halfW, y - halfH, 0),
      floorHeight,
      ceilingHeight,
      color: [wallColor[0] * 0.8, wallColor[1] * 0.8, wallColor[2] * 0.8] as [number, number, number],
    },
    // South wall
    {
      p1: new Vector3(x + halfW, y - halfH, 0),
      p2: new Vector3(x - halfW, y - halfH, 0),
      floorHeight,
      ceilingHeight,
      color: wallColor,
    },
    // West wall
    {
      p1: new Vector3(x - halfW, y - halfH, 0),
      p2: new Vector3(x - halfW, y + halfH, 0),
      floorHeight,
      ceilingHeight,
      color: [wallColor[0] * 0.8, wallColor[1] * 0.8, wallColor[2] * 0.8] as [number, number, number],
    },
  ];
}

/**
 * Create a wall segment helper
 */
export function createWall(
  x1: number, y1: number,
  x2: number, y2: number,
  color: [number, number, number] = [100, 100, 120],
  floorHeight: number = 0,
  ceilingHeight: number = 30
): RaycasterWall {
  return {
    p1: new Vector3(x1, y1, 0),
    p2: new Vector3(x2, y2, 0),
    floorHeight,
    ceilingHeight,
    color,
    solid: true,
  };
}

/**
 * Create a sprite helper
 */
export function createSprite(
  x: number, y: number, z: number,
  width: number, height: number,
  color: [number, number, number] = [255, 0, 0]
): RaycasterSprite {
  return {
    position: new Vector3(x, y, z),
    width,
    height,
    color,
    billboard: true,
  };
}
