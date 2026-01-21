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

import { Vector3, clamp, lerp, rayLineIntersect2D } from './math3d';

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

  /** Ceiling material */
  ceilingMaterial?: RaycasterMaterial;

  /** Floor material */
  floorMaterial?: RaycasterMaterial;

  /** Fog color [r, g, b] (default: black) */
  fogColor?: [number, number, number];

  /** Screen-space overlay color [r, g, b, a] */
  overlayColor?: [number, number, number, number];

  /** Screen-space render offset [x, y] for screen shake */
  renderOffset?: [number, number];

  /** Vertical projection scale multiplier (default: 1.0). Higher values make walls/sprites taller. */
  projectionScale?: number;
}

/**
 * Material definition for surfaces
 */
export type RaycasterMaterial =
  | { type: 'solid'; color: [number, number, number] }
  | { type: 'texture'; textureId: number | string }
  | { type: 'procedural'; sample: (u: number, v: number) => [number, number, number] };

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

  /** Wall material */
  material?: RaycasterMaterial;

  /** Wall color [r, g, b] or texture ID (Legacy/Simple API) */
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

  /** Sprite material */
  material?: RaycasterMaterial;

  /** Color [r, g, b] or texture ID (Legacy/Simple API) */
  color: [number, number, number] | number;

  /** Optional alpha 0-1 */
  alpha?: number;

  /** Optional: vertical offset from floor */
  zOffset?: number;

  /** Optional: always face camera (billboard) - default true */
  billboard?: boolean;
}

/**
 * Generic renderable object (e.g. primitive models)
 */
export interface RenderableObject {
  render(buffer: Uint8Array, context: RaycasterRenderContext): void;
}

/**
 * Texture definition
 */
export interface RaycasterTexture {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray; // RGBA data
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

  /** Camera roll angle (radians) - for leaning left/right */
  roll?: number;

  /** Camera height above floor */
  height: number;
}

/**
 * Rendering context holding buffers and camera state
 * Allows for multiple render passes
 */
export interface RaycasterRenderContext {
  /** Width of the render buffers */
  width: number;

  /** Height of the render buffers */
  height: number;

  /** Depth buffer (Float32Array of size width) */
  depthBuffer: Float32Array;

  /** Current camera state */
  camera: RaycasterCamera;

  /** Available textures */
  textures: Map<number | string, RaycasterTexture>;

  /** Screen-space render offset [x, y] */
  renderOffset: [number, number];

  /** Vertical projection scale multiplier */
  projectionScale: number;
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
  private textures: Map<number | string, RaycasterTexture> = new Map();

  // Configuration
  private fov: number = Math.PI / 3; // 60 degrees
  private maxDistance: number = 200;
  private renderFloorCeiling: boolean = true;
  private enableFog: boolean = true;
  private fogDensity: number = 0.5;
  private ceilingColor: [number, number, number] = [30, 30, 40];
  private floorColor: [number, number, number] = [50, 50, 60];
  private fogColor: [number, number, number] = [0, 0, 0];
  private ceilingMaterial: RaycasterMaterial | null = null;
  private floorMaterial: RaycasterMaterial | null = null;
  private overlayColor: [number, number, number, number] | null = null;
  private renderOffset: [number, number] = [0, 0];
  private projectionScale: number = 1.0;

  constructor(width: number, height: number, config?: RaycasterConfig) {
    this.width = width;
    this.height = height;
    this.depthBuffer = new Float32Array(width);

    if (config) {
      this.configure(config);
    }
  }

  /**
   * Register a texture
   */
  addTexture(id: number | string, texture: RaycasterTexture): void {
    this.textures.set(id, texture);
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
    if (config.ceilingMaterial !== undefined) this.ceilingMaterial = config.ceilingMaterial;
    if (config.floorMaterial !== undefined) this.floorMaterial = config.floorMaterial;
    if (config.overlayColor !== undefined) this.overlayColor = config.overlayColor;
    if (config.renderOffset !== undefined) this.renderOffset = config.renderOffset;
    if (config.projectionScale !== undefined) this.projectionScale = config.projectionScale;
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
   * @param objects - Array of generic renderable objects
   */
  render(
    buffer: Uint8Array,
    camera: RaycasterCamera,
    walls: RaycasterWall[],
    sprites?: RaycasterSprite[],
    objects?: RenderableObject[]
  ): void {
    // Create render context wrapping internal state
    const context: RaycasterRenderContext = {
      width: this.width,
      height: this.height,
      depthBuffer: this.depthBuffer,
      camera: camera,
      textures: this.textures,
      renderOffset: this.renderOffset,
      projectionScale: this.projectionScale
    };

    // 1. Clear buffer with floor/ceiling colors
    this.clearBuffer(buffer, context);

    // 2. Reset depth buffer
    context.depthBuffer.fill(this.maxDistance);

    // 3. Render walls (one ray per column)
    this.renderWalls(buffer, context, walls);

    // 4. Render sprites (sorted back-to-front)
    if (sprites && sprites.length > 0) {
      this.renderSprites(buffer, context, sprites);
    }

    // 5. Render custom objects
    if (objects) {
      for (const obj of objects) {
        obj.render(buffer, context);
      }
    }

    // 6. Apply post-processing overlay
    if (this.overlayColor) {
      this.applyOverlay(buffer, this.overlayColor);
    }
  }

  /**
   * Apply a full-screen color overlay
   */
  private applyOverlay(buffer: Uint8Array, color: [number, number, number, number]): void {
    const [or, og, ob, oa] = color;
    const alpha = oa / 255;
    const invAlpha = 1 - alpha;

    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = Math.floor(or * alpha + buffer[i] * invAlpha);
      buffer[i + 1] = Math.floor(og * alpha + buffer[i + 1] * invAlpha);
      buffer[i + 2] = Math.floor(ob * alpha + buffer[i + 2] * invAlpha);
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
      const hit = rayLineIntersect2D(
        origin.x, origin.y,
        dirX, dirY,
        wall.p1.x, wall.p1.y,
        wall.p2.x, wall.p2.y
      );

      if (hit && hit.t < closestDistance && hit.t > 0.001) {
        closestDistance = hit.t;

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
          distance: hit.t,
          point: new Vector3(
            origin.x + dirX * hit.t,
            origin.y + dirY * hit.t,
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

  /**
   * Project a 3D world position to 2.5D screen coordinates
   * Returns {x, y, depth} or null if behind camera
   */
  project(position: Vector3, camera: RaycasterCamera): { x: number; y: number; depth: number } | null {
    const dx = position.x - camera.position.x;
    const dy = position.y - camera.position.y;

    const cosA = Math.cos(camera.angle);
    const sinA = Math.sin(camera.angle);

    // transformY = forward distance
    const transformY = dx * cosA + dy * sinA;
    // transformX = right offset
    const transformX = dx * sinA - dy * cosA;

    if (transformY <= 0.1) return null;

    const screenX = (1 + transformX / transformY) * this.width / 2;

    const scaleFactor = this.height / transformY;
    const pitch = camera.pitch || 0;
    const pitchOffset = pitch * this.height * 0.5;
    const roll = camera.roll || 0;
    const rollOffset = (screenX - this.width / 2) * roll;

    // Correct vertical position based on height and pitch
    const screenY = this.height / 2 + pitchOffset + rollOffset - (position.z - camera.height) * scaleFactor;

    return { x: screenX, y: screenY, depth: transformY };
  }

  // ==================== Private Methods ====================

  /**
   * Sample color from texture using nearest neighbor
   */
  private sampleTexture(
    texture: RaycasterTexture,
    u: number,
    v: number
  ): [number, number, number] {
    // Clamp coordinates
    u = Math.max(0, Math.min(1, u));
    v = Math.max(0, Math.min(1, v));

    // Map to pixel coordinates
    let texX = Math.floor(u * texture.width);
    let texY = Math.floor(v * texture.height);

    // Clamp to valid range (handles u=1 or v=1 cases)
    texX = Math.min(texX, texture.width - 1);
    texY = Math.min(texY, texture.height - 1);

    // Get pixel color (assuming RGBA layout)
    const index = (texY * texture.width + texX) * 4;
    
    return [
      texture.data[index],
      texture.data[index + 1],
      texture.data[index + 2]
    ];
  }

  /**
   * Clear the buffer with floor and ceiling colors
   */
  private clearBuffer(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const halfHeight = context.height / 2;
    const pitch = context.camera.pitch || 0;
    const roll = context.camera.roll || 0;
    const pitchOffset = pitch * context.height * 0.5;

    for (let x = 0; x < context.width; x++) {
      // Ray direction for this column
      // Left edge (x=0) should be camera.angle + fov/2 (counterclockwise)
      // Right edge (x=width) should be camera.angle - fov/2 (clockwise)
      const rayScreenPos = (x / context.width) - 0.5;
      const rayAngle = context.camera.angle - rayScreenPos * this.fov;
      const rayDirX = Math.cos(rayAngle);
      const rayDirY = Math.sin(rayAngle);

      // Precalculate roll offset for this column
      const rollOffset = (x - context.width / 2) * roll;
      const horizonY = halfHeight + pitchOffset + rollOffset;

      for (let y = 0; y < context.height; y++) {
        let r: number, g: number, b: number;

        // Apply render offset (screen shake)
        const shiftedX = x + context.renderOffset[0];
        const shiftedY = y + context.renderOffset[1];

        // Only draw if within buffer bounds
        if (shiftedX < 0 || shiftedX >= context.width || shiftedY < 0 || shiftedY >= context.height) {
          continue;
        }

        if (this.renderFloorCeiling) {
          const isFloor = y >= horizonY;
          const material = isFloor ? this.floorMaterial : this.ceilingMaterial;

          if (material) {
            // Floor/Ceiling casting
            // Distance from horizon
            const dy = Math.abs(y - horizonY);
            if (dy > 0.1) {
              // Distance to point on floor/ceiling plane
              // dist = (planeZ - cameraZ) * height * scale / (y - horizonY)
              // We use constant floorZ=0 and ceilingZ=30 for now as foundations
              const planeZ = isFloor ? 0 : 30;
              const dist = Math.abs(context.camera.height - planeZ) * halfHeight * context.projectionScale / dy;
              
              // Fisheye correction
              const realDist = dist / Math.cos(rayScreenPos * this.fov);
              
              // World position
              const worldX = context.camera.position.x + rayDirX * realDist;
              const worldY = context.camera.position.y + rayDirY * realDist;

              // Sample material (use fractional part for tiling)
              const u = worldX - Math.floor(worldX);
              const v = worldY - Math.floor(worldY);

              if (material.type === 'procedural') {
                [r, g, b] = material.sample(u, v);
              } else if (material.type === 'texture') {
                const tex = context.textures.get(material.textureId);
                if (tex) {
                  [r, g, b] = this.sampleTexture(tex, u, v);
                } else {
                  [r, g, b] = isFloor ? this.floorColor : this.ceilingColor;
                }
              } else {
                [r, g, b] = material.color;
              }

              // Apply fog to floor/ceiling
              if (this.enableFog) {
                const fogFactor = this.calculateFog(realDist);
                r = Math.floor(lerp(r, this.fogColor[0], fogFactor));
                g = Math.floor(lerp(g, this.fogColor[1], fogFactor));
                b = Math.floor(lerp(b, this.fogColor[2], fogFactor));
              }
            } else {
              [r, g, b] = isFloor ? this.floorColor : this.ceilingColor;
            }
          } else {
            // Fallback to solid colors
            [r, g, b] = isFloor ? this.floorColor : this.ceilingColor;
          }
        } else {
          // Just use ceiling color for whole background
          [r, g, b] = this.ceilingColor;
        }

        const offset = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
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
    context: RaycasterRenderContext,
    walls: RaycasterWall[]
  ): void {
    for (let x = 0; x < context.width; x++) {
      // Calculate ray angle for this column
      // Left edge (x=0) should be camera.angle + fov/2 (counterclockwise)
      // Right edge (x=width) should be camera.angle - fov/2 (clockwise)
      const rayScreenPos = (x / context.width) - 0.5; // -0.5 to 0.5
      const rayAngle = context.camera.angle - rayScreenPos * this.fov;

      // Cast ray
      const hit = this.castRay(context.camera.position, rayAngle, walls);

      if (hit) {
        // Fisheye correction: use perpendicular distance
        const perpDist = hit.distance * Math.cos(rayAngle - context.camera.angle);

        // Store in depth buffer
        context.depthBuffer[x] = perpDist;

        // Draw wall stripe
        this.drawWallStripe(buffer, x, perpDist, hit, context);
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
    context: RaycasterRenderContext
  ): void {
    const wall = hit.wall;

    // Calculate wall height on screen
    const wallHeight = wall.ceilingHeight - wall.floorHeight;
    const scaleFactor = context.height * context.projectionScale / perpDist;
    const screenWallHeight = wallHeight * scaleFactor;

    // Calculate vertical position (accounting for camera height, pitch and roll)
    // Screen Y formula: screenY = centerY - (worldZ - cameraZ) * scale
    // Wall floor screen position: centerY - (floorZ - cameraZ) * scale
    // Wall ceiling screen position: centerY - (ceilZ - cameraZ) * scale
    const pitch = context.camera.pitch || 0;
    const roll = context.camera.roll || 0;
    const pitchOffset = pitch * context.height * 0.5;
    const rollOffset = (x - context.width / 2) * roll;

    const screenCenterY = context.height / 2 + pitchOffset + rollOffset;
    const screenWallTop = screenCenterY - (wall.ceilingHeight - context.camera.height) * scaleFactor;
    const screenWallBottom = screenCenterY - (wall.floorHeight - context.camera.height) * scaleFactor;

    const drawStart = Math.floor(screenWallTop);
    const drawEnd = Math.floor(screenWallBottom);

    // Clamp to screen bounds
    const yStart = Math.max(0, drawStart);
    const yEnd = Math.min(context.height - 1, drawEnd);

    // Get wall base color or prepare material sampling
    let useMaterial = false;
    let baseColor: [number, number, number] = [0, 0, 0];
    
    if (wall.material) {
      useMaterial = true;
      if (wall.material.type === 'solid') {
        baseColor = wall.material.color;
      }
    } else {
      // Legacy color logic
      if (typeof wall.color === 'number') {
        // Texture ID - for now just use gray
        baseColor = [128, 128, 128];
      } else {
        baseColor = hit.side === 1 && wall.backColor ? wall.backColor : wall.color;
      }
    }

    // Apply shading based on side (darker for perpendicular walls)
    const sideShade = hit.side === 0 ? 1.0 : 0.7;

    // Draw the wall stripe
    for (let y = yStart; y <= yEnd; y++) {
      // Apply render offset
      const shiftedX = x + context.renderOffset[0];
      const shiftedY = y + context.renderOffset[1];

      // Only draw if within buffer bounds
      if (shiftedX < 0 || shiftedX >= context.width || shiftedY < 0 || shiftedY >= context.height) {
        continue;
      }

      // Calculate texture V coordinate (0 at top, 1 at bottom)
      const texV = (y - screenWallTop) / (screenWallBottom - screenWallTop);
      const texU = hit.wallU;

      let r: number, g: number, b: number;

      if (useMaterial && wall.material?.type === 'procedural') {
        [r, g, b] = wall.material.sample(texU, texV);
      } else if (useMaterial && wall.material?.type === 'texture') {
        const texture = context.textures.get(wall.material.textureId);
        if (texture) {
          [r, g, b] = this.sampleTexture(texture, texU, texV);
        } else {
          // Placeholder for missing texture
          [r, g, b] = [255, 0, 255];
        }
      } else {
        // Solid material or legacy color
        [r, g, b] = baseColor;
      }

      // Apply distance-based shading
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

      const offset = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
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
    context: RaycasterRenderContext,
    sprites: RaycasterSprite[]
  ): void {
    // Calculate distance from camera to each sprite and sort
    const spriteData: Array<{ sprite: RaycasterSprite; distance: number }> = [];

    for (const sprite of sprites) {
      const dx = sprite.position.x - context.camera.position.x;
      const dy = sprite.position.y - context.camera.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      spriteData.push({ sprite, distance });
    }

    // Sort by distance (far to near)
    spriteData.sort((a, b) => b.distance - a.distance);

    // Render each sprite
    for (const { sprite, distance } of spriteData) {
      this.renderSprite(buffer, context, sprite, distance);
    }
  }

  /**
   * Render a single sprite
   */
  private renderSprite(
    buffer: Uint8Array,
    context: RaycasterRenderContext,
    sprite: RaycasterSprite,
    distance: number
  ): void {
    // Calculate sprite position relative to camera
    const dx = sprite.position.x - context.camera.position.x;
    const dy = sprite.position.y - context.camera.position.y;

    // Transform to camera space
    // Forward direction: (cos(angle), sin(angle))
    // Right direction: (sin(angle), -cos(angle))
    const cosA = Math.cos(context.camera.angle);
    const sinA = Math.sin(context.camera.angle);
    // transformY = forward distance = dot(offset, forward)
    const transformY = dx * cosA + dy * sinA;
    // transformX = right offset = dot(offset, right)
    const transformX = dx * sinA - dy * cosA;

    // Sprite is behind camera
    if (transformY <= 0.1) return;

    // Calculate screen position
    const screenX = Math.floor((1 + transformX / transformY) * context.width / 2);

    // Calculate sprite dimensions on screen
    const scaleFactor = context.height * context.projectionScale / transformY;
    const spriteScreenWidth = Math.floor(sprite.width * scaleFactor);
    const spriteScreenHeight = Math.floor(sprite.height * scaleFactor);

    // Calculate vertical position constants
    const pitch = context.camera.pitch || 0;
    const roll = context.camera.roll || 0;
    const pitchOffset = pitch * context.height * 0.5;
    const zOffset = sprite.zOffset || 0;
    const spriteZ = sprite.position.z + zOffset;
    const verticalOffset = (context.camera.height - spriteZ - sprite.height / 2) * scaleFactor;

    // Calculate sprite bounds on screen
    const spriteStartX = Math.floor(screenX - spriteScreenWidth / 2);
    const spriteEndX = spriteStartX + spriteScreenWidth;

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
    for (let x = Math.max(0, spriteStartX); x < Math.min(context.width, spriteEndX); x++) {
      // Check depth buffer - only draw if sprite is closer than wall
      if (transformY >= context.depthBuffer[x]) continue;

      // Calculate per-column vertical position due to roll
      const rollOffset = (x - context.width / 2) * roll;
      const screenY = Math.floor(context.height / 2 + pitchOffset + rollOffset - spriteScreenHeight / 2 + verticalOffset);
      
      const spriteStartYForCol = screenY;
      const spriteEndYForCol = screenY + spriteScreenHeight;

      for (let y = Math.max(0, spriteStartYForCol); y < Math.min(context.height, spriteEndYForCol); y++) {
        // Apply render offset
        const shiftedX = x + context.renderOffset[0];
        const shiftedY = y + context.renderOffset[1];

        // Only draw if within buffer bounds
        if (shiftedX < 0 || shiftedX >= context.width || shiftedY < 0 || shiftedY >= context.height) {
          continue;
        }

        // Calculate texture coordinates
        const texU = (x - spriteStartX) / spriteScreenWidth;
        const texV = (y - spriteStartYForCol) / spriteScreenHeight;

        let r: number, g: number, b: number;

        if (sprite.material) {
          if (sprite.material.type === 'procedural') {
            [r, g, b] = sprite.material.sample(texU, texV);
          } else if (sprite.material.type === 'texture') {
            const tex = context.textures.get(sprite.material.textureId);
            if (tex) {
              [r, g, b] = this.sampleTexture(tex, texU, texV);
            } else {
              [r, g, b] = [255, 0, 255];
            }
          } else {
            [r, g, b] = sprite.material.color;
          }
        } else {
          // Legacy color
          if (typeof sprite.color === 'number') {
            [r, g, b] = [255, 0, 255];
          } else {
            [r, g, b] = spriteColor;
          }
        }

        // Apply distance-based shading/fog to sprite
        if (this.enableFog) {
          const fogFactor = this.calculateFog(transformY);
          r = Math.floor(lerp(r, this.fogColor[0], fogFactor));
          g = Math.floor(lerp(g, this.fogColor[1], fogFactor));
          b = Math.floor(lerp(b, this.fogColor[2], fogFactor));
        }

        // Apply alpha blending
        const offset = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
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

/**
 * Simple 3D Box renderer for the raycaster
 */
export class BoxRenderer implements RenderableObject {
  constructor(
    public center: Vector3,
    public size: Vector3,
    public color: [number, number, number]
  ) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    // Project box vertices to screen
    // We'll use a simplified approach: project the 8 vertices and find screen bounds
    const half = this.size.multiplyScalar(0.5);
    const vertices = [
      new Vector3(this.center.x - half.x, this.center.y - half.y, this.center.z - half.z),
      new Vector3(this.center.x + half.x, this.center.y - half.y, this.center.z - half.z),
      new Vector3(this.center.x - half.x, this.center.y + half.y, this.center.z - half.z),
      new Vector3(this.center.x + half.x, this.center.y + half.y, this.center.z - half.z),
      new Vector3(this.center.x - half.x, this.center.y - half.y, this.center.z + half.z),
      new Vector3(this.center.x + half.x, this.center.y - half.y, this.center.z + half.z),
      new Vector3(this.center.x - half.x, this.center.y + half.y, this.center.z + half.z),
      new Vector3(this.center.x + half.x, this.center.y + half.y, this.center.z + half.z),
    ];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minDepth = Infinity;

    const projected = [];
    for (const v of vertices) {
      const p = this.project(v, context);
      if (p) {
        projected.push(p);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        minDepth = Math.min(minDepth, p.depth);
      }
    }

    if (projected.length === 0) return;

    // Clamp to screen
    const xStart = Math.max(0, Math.floor(minX));
    const xEnd = Math.min(context.width - 1, Math.ceil(maxX));

    for (let x = xStart; x <= xEnd; x++) {
      // Occlusion check (using min depth of whole box for simplicity)
      if (minDepth >= context.depthBuffer[x]) continue;

      // Calculate vertical bounds for this column
      // (This is a simplified projection)
      const yStart = Math.max(0, Math.floor(minY));
      const yEnd = Math.min(context.height - 1, Math.ceil(maxY));

      for (let y = yStart; y <= yEnd; y++) {
        const offset = (y * context.width + x) * 4;
        buffer[offset] = this.color[0];
        buffer[offset + 1] = this.color[1];
        buffer[offset + 2] = this.color[2];
        buffer[offset + 3] = 255;
      }
    }
  }

  private project(position: Vector3, context: RaycasterRenderContext): { x: number; y: number; depth: number } | null {
    const dx = position.x - context.camera.position.x;
    const dy = position.y - context.camera.position.y;

    const cosA = Math.cos(context.camera.angle);
    const sinA = Math.sin(context.camera.angle);

    const transformY = dx * cosA + dy * sinA;
    const transformX = dx * sinA - dy * cosA;

    if (transformY <= 0.1) return null;

    const screenX = (1 + transformX / transformY) * context.width / 2;
    const scaleFactor = context.height / transformY;
    const pitch = context.camera.pitch || 0;
    const pitchOffset = pitch * context.height * 0.5;
    const roll = context.camera.roll || 0;
    const rollOffset = (screenX - context.width / 2) * roll;

    const screenY = context.height / 2 + pitchOffset + rollOffset - (position.z - context.camera.height) * scaleFactor;

    return { x: screenX, y: screenY, depth: transformY };
  }
}

/**
 * Simple 3D Cylinder renderer for the raycaster
 */
export class CylinderRenderer implements RenderableObject {
  constructor(
    public center: Vector3,
    public radius: number,
    public height: number,
    public color: [number, number, number],
    public segments: number = 8
  ) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    // Render as a series of vertical strips by projecting the cylinder's silhouette
    // Project the center line
    const bottomCenter = new Vector3(this.center.x, this.center.y, this.center.z - this.height / 2);
    const topCenter = new Vector3(this.center.x, this.center.y, this.center.z + this.height / 2);

    const pBottom = this.project(bottomCenter, context);
    const pTop = this.project(topCenter, context);

    if (!pBottom || !pTop) return;

    // Approximate screen-space radius
    const scaleFactor = context.height / pBottom.depth;
    const screenRadius = this.radius * scaleFactor;

    const xStart = Math.max(0, Math.floor(pBottom.x - screenRadius));
    const xEnd = Math.min(context.width - 1, Math.ceil(pBottom.x + screenRadius));

    for (let x = xStart; x <= xEnd; x++) {
      // Occlusion check
      if (pBottom.depth >= context.depthBuffer[x]) continue;

      // Calculate vertical bounds for this column (silhouette of cylinder)
      const dx = (x - pBottom.x) / screenRadius;
      const dy = Math.sqrt(Math.max(0, 1 - dx * dx));
      
      // In a simple 2.5D projection, the top and bottom edges are horizontal 
      // unless we want to do full elliptical projection (complex)
      const yBottom = pBottom.y;
      const yTop = pTop.y;

      const yStart = Math.max(0, Math.floor(Math.min(yBottom, yTop)));
      const yEnd = Math.min(context.height - 1, Math.ceil(Math.max(yBottom, yTop)));

      for (let y = yStart; y <= yEnd; y++) {
        const offset = (y * context.width + x) * 4;
        buffer[offset] = this.color[0];
        buffer[offset + 1] = this.color[1];
        buffer[offset + 2] = this.color[2];
        buffer[offset + 3] = 255;
      }
    }
  }

  private project(position: Vector3, context: RaycasterRenderContext): { x: number; y: number; depth: number } | null {
    const dx = position.x - context.camera.position.x;
    const dy = position.y - context.camera.position.y;

    const cosA = Math.cos(context.camera.angle);
    const sinA = Math.sin(context.camera.angle);

    const transformY = dx * cosA + dy * sinA;
    const transformX = dx * sinA - dy * cosA;

    if (transformY <= 0.1) return null;

    const screenX = (1 + transformX / transformY) * context.width / 2;
    const scaleFactor = context.height / transformY;
    const pitch = context.camera.pitch || 0;
    const pitchOffset = pitch * context.height * 0.5;
    const roll = context.camera.roll || 0;
    const rollOffset = (screenX - context.width / 2) * roll;

    const screenY = context.height / 2 + pitchOffset + rollOffset - (position.z - context.camera.height) * scaleFactor;

    return { x: screenX, y: screenY, depth: transformY };
  }
}

