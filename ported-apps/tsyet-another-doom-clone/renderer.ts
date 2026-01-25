/**
 * RaycastRenderer for Yet Another Doom Clone
 * Refactored to use cosyne Raycaster
 */

import {
  Raycaster,
  RaycasterWall,
  RenderableObject,
  Vector3,
} from 'cosyne';
import { generateBrickTexture, generateTileTexture } from './texture-gen';
import { Player } from './player';
import { GameMap, WallSegment } from './game-map';
import { Enemy } from './enemy';
import { WalkingEnemy } from './walking-enemy';
import { FlyingEnemy } from './flying-enemy';
import { BodyPart } from './body-part';
import { Chaingun } from './chaingun';
import { HitParticle, LightFlash } from './hit-particle';
import {
  WalkingEnemyRenderer,
  FlyingEnemyRenderer,
  BodyPartRenderer,
  HitParticleRenderer,
  ChaingunRenderer,
  HUDRenderer
} from './game-renderables';

export interface RaycastHit {
  distance: number;
  wallX: number;
  wall: WallSegment | null;
  side: number;
  color: [number, number, number];
}

export class RaycastRenderer {
  width: number;
  height: number;
  raycaster: Raycaster;
  maxRenderDistance: number = 200;

  // Texture IDs
  private texBrickNS = 1;
  private texBrickEW = 2;
  private texFloor = 3;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.raycaster = new Raycaster(width, height, {
      fov: Math.PI / 3,
      maxDistance: this.maxRenderDistance,
      renderFloorCeiling: true,
      ceilingColor: [30, 30, 40],
      floorMaterial: { type: 'texture', textureId: this.texFloor },
      enableFog: true,
      fogColor: [0, 0, 0],
      fogDensity: 0.5,
      projectionScale: 1.5  // Match original doom clone's projection scale
    });

    // Register generated textures
    this.raycaster.addTexture(this.texBrickNS, generateBrickTexture([140, 100, 80]));
    this.raycaster.addTexture(this.texBrickEW, generateBrickTexture([120, 85, 70]));
    this.raycaster.addTexture(this.texFloor, generateTileTexture([50, 50, 60]));
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.raycaster.resize(width, height);
  }

  get depthBuffer(): Float32Array {
    return this.raycaster.getDepthBuffer();
  }

  setRenderOffset(x: number, y: number): void {
    this.raycaster.configure({ renderOffset: [x, y] });
  }

  // Compatibility stub - Hitscan logic is actually in DoomGame.shoot via rayLineIntersect
  castRay(player: Player, map: GameMap, rayAngle: number): RaycastHit {
    // This method was used internally by the old renderer but might not be used externally.
    // If it is, we'd need to map back to original structures.
    // For now, returning a safe default.
    return {
        distance: Infinity,
        wallX: 0,
        wall: null,
        side: 0,
        color: [0,0,0]
    };
  }

  render(
    buffer: Uint8Array,
    player: Player,
    map: GameMap,
    enemies: Enemy[],
    bodyParts: BodyPart[] = [],
    chaingun?: Chaingun,
    hitParticles: HitParticle[] = [],
    lightFlashes: LightFlash[] = []
  ): void {
    // 1. Prepare Camera
    const eyeZ = player.position.z + player.getVerticalBob();
    const camera = {
      position: new Vector3(player.position.x, player.position.y, 0),
      angle: player.theta,
      height: eyeZ,
      pitch: 0,
      roll: player.getCameraRoll()
    };

    // 2. Prepare Walls
    const walls: RaycasterWall[] = map.walls.map(w => {
        const dx = w.p2.x - w.p1.x;
        const dy = w.p2.y - w.p1.y;
        const isNS = Math.abs(dx) > Math.abs(dy);
        return {
            p1: w.p1,
            p2: w.p2,
            floorHeight: w.floorZ,
            ceilingHeight: w.floorZ + w.height,
            color: [0,0,0],
            material: { type: 'texture', textureId: isNS ? this.texBrickNS : this.texBrickEW },
            solid: true
        };
    });

    // 3. Prepare Renderable Objects
    const objects: RenderableObject[] = [];

    // Enemies
    for (const e of enemies) {
        if (e.dead) continue;
        if (e.type === 'walking') {
            objects.push(new WalkingEnemyRenderer(e as WalkingEnemy, player.position));
        } else {
            objects.push(new FlyingEnemyRenderer(e as FlyingEnemy, player.position));
        }
    }

    // Body Parts
    for (const p of bodyParts) {
        objects.push(new BodyPartRenderer(p, player.position));
    }

    // Hit Particles
    for (const p of hitParticles) {
        objects.push(new HitParticleRenderer(p, player.position));
    }

    // Chaingun
    if (chaingun) {
        objects.push(new ChaingunRenderer(chaingun));
    }

    // HUD
    objects.push(new HUDRenderer(player));

    // 4. Render Scene
    this.raycaster.render(buffer, camera, walls, [], objects);

    // 5. Apply Light Flashes (Overlay effect)
    this.applyLightFlashes(buffer, player, lightFlashes);
  }

  private applyLightFlashes(
    buffer: Uint8Array,
    player: Player,
    lightFlashes: LightFlash[]
  ): void {
    for (const flash of lightFlashes) {
      if (flash.dead) continue;

      const spriteDir = flash.position.sub(player.position);
      const distance = new Vector3(spriteDir.x, spriteDir.y, 0).length(); // noz

      if (distance < 2 || distance > this.maxRenderDistance) continue;

      const spriteAngle = Math.atan2(spriteDir.y, spriteDir.x);
      let angleDiff = spriteAngle - player.theta;

      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) > Math.PI / 3 / 2 + 0.5) continue;

      const screenX = Math.floor((0.5 - angleDiff / (Math.PI / 3)) * this.width);
      const eyeZ = player.position.z + player.getVerticalBob();
      const heightDiff = flash.position.z - eyeZ;
      const centerY = this.height / 2;
      const scale = this.height * 1.5;
      const screenY = centerY - (heightDiff * scale) / distance;

      const flashRadius = (flash.radius * this.height) / distance;

      this.applyFlashEffect(buffer, screenX, screenY, flashRadius, flash.color, flash.intensity);
    }
  }

  private applyFlashEffect(
    buffer: Uint8Array,
    cx: number,
    cy: number,
    radius: number,
    color: [number, number, number],
    intensity: number
  ): void {
    const startX = Math.floor(cx - radius);
    const endX = Math.ceil(cx + radius);
    const startY = Math.floor(cy - radius);
    const endY = Math.ceil(cy + radius);

    for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
      for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          const falloff = Math.pow(1 - dist / radius, 1.5) * intensity;
          if (falloff > 0.02) {
            const idx = (y * this.width + x) * 4;
            buffer[idx] = Math.min(255, buffer[idx] + Math.floor(color[0] * falloff * 0.5));
            buffer[idx + 1] = Math.min(255, buffer[idx + 1] + Math.floor(color[1] * falloff * 0.5));
            buffer[idx + 2] = Math.min(255, buffer[idx + 2] + Math.floor(color[2] * falloff * 0.5));
          }
        }
      }
    }
  }
}