import {
  RenderableObject,
  RaycasterRenderContext,
  lerp
} from '../../cosyne/src/raycaster';
import { Vector3 } from '../../cosyne/src/math3d';
import { WalkingEnemy } from './walking-enemy';
import { FlyingEnemy } from './flying-enemy';
import { BodyPart } from './body-part';
import { HitParticle, LightFlash } from './hit-particle';
import { Player } from './player';
import { Chaingun } from './chaingun';

// ============================================================================
// Helper Functions
// ============================================================================

function project(
  position: Vector3,
  context: RaycasterRenderContext
): { x: number; y: number; depth: number } | null {
  const dx = position.x - context.camera.position.x;
  const dy = position.y - context.camera.position.y;

  const cosA = Math.cos(context.camera.angle);
  const sinA = Math.sin(context.camera.angle);

  const transformY = dx * cosA + dy * sinA;
  const transformX = dx * sinA - dy * cosA;

  if (transformY <= 0.1) return null;

  const screenX = (1 + transformX / transformY) * context.width / 2;
  const scaleFactor = context.height * context.projectionScale / transformY;
  const pitch = context.camera.pitch || 0;
  const pitchOffset = pitch * context.height * 0.5;
  const roll = context.camera.roll || 0;
  const rollOffset = (screenX - context.width / 2) * roll;

  const screenY = context.height / 2 + pitchOffset + rollOffset - (position.z - context.camera.height) * scaleFactor;

  return { x: screenX, y: screenY, depth: transformY };
}

function drawBox(
  buffer: Uint8Array,
  context: RaycasterRenderContext,
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: [number, number, number],
  shade: number,
  distance: number
): void {
  const startX = Math.floor(cx - width / 2);
  const endX = Math.floor(cx + width / 2);
  const startY = Math.floor(cy - height / 2);
  const endY = Math.floor(cy + height / 2);

  const offX = context.renderOffset ? context.renderOffset[0] : 0;
  const offY = context.renderOffset ? context.renderOffset[1] : 0;

  for (let x = Math.max(0, startX); x < Math.min(context.width, endX); x++) {
    if (distance >= context.depthBuffer[x]) continue;

    const shiftedX = x + offX;
    if (shiftedX < 0 || shiftedX >= context.width) continue;

    for (let y = Math.max(0, startY); y < Math.min(context.height, endY); y++) {
      const shiftedY = y + offY;
      if (shiftedY < 0 || shiftedY >= context.height) continue;

      const idx = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
      buffer[idx] = Math.floor(color[0] * shade);
      buffer[idx + 1] = Math.floor(color[1] * shade);
      buffer[idx + 2] = Math.floor(color[2] * shade);
      buffer[idx + 3] = 255;
    }
  }
}

function drawEllipse(
  buffer: Uint8Array,
  context: RaycasterRenderContext,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  baseColor: [number, number, number],
  highlightColor: [number, number, number]
): void {
  const startX = Math.floor(cx - radiusX);
  const endX = Math.ceil(cx + radiusX);
  const startY = Math.floor(cy - radiusY);
  const endY = Math.ceil(cy + radiusY);

  const offX = context.renderOffset ? context.renderOffset[0] : 0;
  const offY = context.renderOffset ? context.renderOffset[1] : 0;

  for (let x = Math.max(0, startX); x < Math.min(context.width, endX); x++) {
    const shiftedX = x + offX;
    if (shiftedX < 0 || shiftedX >= context.width) continue;

    for (let y = Math.max(0, startY); y < Math.min(context.height, endY); y++) {
      const shiftedY = y + offY;
      if (shiftedY < 0 || shiftedY >= context.height) continue;

      const dx = (x - cx) / radiusX;
      const dy = (y - cy) / radiusY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 1) {
        const shade = 0.6 + 0.4 * (1 - dist) + 0.2 * (-dy);
        const edgeFactor = dist;
        const highlight = edgeFactor > 0.7 ? (edgeFactor - 0.7) / 0.3 * 0.3 : 0;

        const r = Math.floor(baseColor[0] * shade + (highlightColor[0] - baseColor[0]) * highlight);
        const g = Math.floor(baseColor[1] * shade + (highlightColor[1] - baseColor[1]) * highlight);
        const b = Math.floor(baseColor[2] * shade + (highlightColor[2] - baseColor[2]) * highlight);

        const idx = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
        buffer[idx] = Math.min(255, Math.max(0, r));
        buffer[idx + 1] = Math.min(255, Math.max(0, g));
        buffer[idx + 2] = Math.min(255, Math.max(0, b));
        buffer[idx + 3] = 255;
      }
    }
  }
}

function drawGunBody(
  buffer: Uint8Array,
  context: RaycasterRenderContext,
  cx: number,
  cy: number,
  radius: number,
  length: number,
  squash: number,
  color: [number, number, number]
): void {
  const startX = Math.floor(cx - radius);
  const endX = Math.ceil(cx + radius);
  const startY = Math.floor(cy);
  const endY = Math.ceil(cy + length);

  const offX = context.renderOffset ? context.renderOffset[0] : 0;
  const offY = context.renderOffset ? context.renderOffset[1] : 0;

  for (let x = Math.max(0, startX); x < Math.min(context.width, endX); x++) {
    const dx = x - cx;
    if (Math.abs(dx) > radius) continue;

    const edgeFactor = Math.abs(dx) / radius;
    const shade = 0.6 + 0.4 * (1 - edgeFactor) * (0.5 + 0.5 * (dx / radius + 1) / 2);

    const shiftedX = x + offX;
    if (shiftedX < 0 || shiftedX >= context.width) continue;

    for (let y = Math.max(0, startY); y < Math.min(context.height, endY); y++) {
      const shiftedY = y + offY;
      if (shiftedY < 0 || shiftedY >= context.height) continue;

      const lengthFactor = (y - cy) / length;
      const finalShade = shade * (1 - lengthFactor * 0.3);

      const idx = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
      buffer[idx] = Math.floor(color[0] * finalShade);
      buffer[idx + 1] = Math.floor(color[1] * finalShade);
      buffer[idx + 2] = Math.floor(color[2] * finalShade);
      buffer[idx + 3] = 255;
    }
  }
}

function drawBarrelTube(
  buffer: Uint8Array,
  context: RaycasterRenderContext,
  cx: number,
  cy: number,
  radius: number,
  length: number,
  color: [number, number, number]
): void {
  const startY = Math.floor(cy - length);
  const endY = Math.floor(cy);
  const halfWidth = radius;
  const startX = Math.floor(cx - halfWidth);
  const endX = Math.ceil(cx + halfWidth);

  const offX = context.renderOffset ? context.renderOffset[0] : 0;
  const offY = context.renderOffset ? context.renderOffset[1] : 0;

  for (let x = Math.max(0, startX); x < Math.min(context.width, endX); x++) {
    const dx = (x - cx) / halfWidth;
    const cylShade = Math.sqrt(1 - dx * dx);

    const shiftedX = x + offX;
    if (shiftedX < 0 || shiftedX >= context.width) continue;

    for (let y = Math.max(0, startY); y < Math.min(context.height, endY); y++) {
      const yFactor = (y - startY) / length;
      const perspWidth = halfWidth * (0.7 + 0.3 * yFactor);

      if (Math.abs(x - cx) > perspWidth) continue;

      const shiftedY = y + offY;
      if (shiftedY < 0 || shiftedY >= context.height) continue;

      const shade = cylShade * (0.7 + 0.3 * yFactor);

      const idx = (Math.floor(shiftedY) * context.width + Math.floor(shiftedX)) * 4;
      buffer[idx] = Math.floor(color[0] * shade);
      buffer[idx + 1] = Math.floor(color[1] * shade);
      buffer[idx + 2] = Math.floor(color[2] * shade);
      buffer[idx + 3] = 255;
    }
  }
}

// ============================================================================
// Renderable Classes
// ============================================================================

export class WalkingEnemyRenderer implements RenderableObject {
  constructor(public enemy: WalkingEnemy, public playerPos: Vector3) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const dist = this.enemy.position.distanceTo(this.playerPos);
    if (dist < 0.1) return;

    const p = project(this.enemy.position, context);
    if (!p) return;

    const scale = (context.height * 15) / p.depth;
    const shade = Math.max(0.3, 1 - p.depth / 200);

    const centerY = p.y;
    const screenX = p.x;

    const armSwing = Math.sin(this.enemy.time) * 0.3;
    const legSwing = Math.sin(this.enemy.time) * 0.25;
    const verticalBob = Math.abs(Math.sin(this.enemy.time * 2)) * scale * 0.05;

    const bodyWidth = scale * 0.4;
    const bodyHeight = scale * 0.35;
    const headSize = scale * 0.25;
    const limbWidth = scale * 0.12;
    const limbHeight = scale * 0.3;

    drawBox(buffer, context, screenX, centerY - verticalBob, bodyWidth, bodyHeight,
      this.enemy.bodyColor, shade, p.depth);

    drawBox(buffer, context, screenX, centerY - bodyHeight * 0.6 - headSize * 0.4 - verticalBob,
      headSize, headSize, this.enemy.headColor, shade, p.depth);

    const eyeSize = scale * 0.06;
    const eyeY = centerY - bodyHeight * 0.6 - headSize * 0.4 - verticalBob;
    drawBox(buffer, context, screenX - headSize * 0.25, eyeY, eyeSize, eyeSize,
      this.enemy.eyeColor, shade, p.depth);
    drawBox(buffer, context, screenX + headSize * 0.25, eyeY, eyeSize, eyeSize,
      this.enemy.eyeColor, shade, p.depth);

    const legY = centerY + bodyHeight * 0.4 - verticalBob;
    drawBox(buffer, context, screenX - bodyWidth * 0.25 + legSwing * scale * 0.2, legY + limbHeight * 0.5,
      limbWidth, limbHeight, this.enemy.bodyColor, shade * 0.9, p.depth);
    drawBox(buffer, context, screenX + bodyWidth * 0.25 - legSwing * scale * 0.2, legY + limbHeight * 0.5,
      limbWidth, limbHeight, this.enemy.bodyColor, shade * 0.9, p.depth);

    const armY = centerY - bodyHeight * 0.1 - verticalBob;
    drawBox(buffer, context, screenX - bodyWidth * 0.5 - limbWidth * 0.3 - armSwing * scale * 0.15, armY,
      limbWidth * 0.8, limbHeight * 0.8, this.enemy.bodyColor, shade * 0.85, p.depth);
    drawBox(buffer, context, screenX + bodyWidth * 0.5 + limbWidth * 0.3 + armSwing * scale * 0.15, armY,
      limbWidth * 0.8, limbHeight * 0.8, this.enemy.bodyColor, shade * 0.85, p.depth);
  }
}

export class FlyingEnemyRenderer implements RenderableObject {
  constructor(public enemy: FlyingEnemy, public playerPos: Vector3) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const dist = this.enemy.position.distanceTo(this.playerPos);
    if (dist < 0.1) return;

    const p = project(this.enemy.position, context);
    if (!p) return;

    const scale = (context.height * 15) / p.depth;
    const shade = Math.max(0.3, 1 - p.depth / 200);

    const centerY = p.y;
    const screenX = p.x;

    const wingAngle = Math.sin(this.enemy.time * 8) * 0.5;
    const verticalBob = Math.sin(this.enemy.time * 2) * scale * 0.1;

    const bodyWidth = scale * 0.2;
    const bodyHeight = scale * 0.15;
    const wingSpan = scale * 0.5;
    const wingHeight = scale * 0.08;

    drawBox(buffer, context, screenX, centerY - verticalBob, bodyWidth, bodyHeight,
      this.enemy.bodyColor, shade, p.depth);

    const leftWingX = screenX - bodyWidth * 0.5 - wingSpan * 0.4;
    const leftWingY = centerY - verticalBob + wingAngle * scale * 0.2;
    drawBox(buffer, context, leftWingX, leftWingY, wingSpan * 0.6, wingHeight,
      this.enemy.wingColor, shade, p.depth);

    const rightWingX = screenX + bodyWidth * 0.5 + wingSpan * 0.4;
    const rightWingY = centerY - verticalBob + wingAngle * scale * 0.2;
    drawBox(buffer, context, rightWingX, rightWingY, wingSpan * 0.6, wingHeight,
      this.enemy.wingColor, shade, p.depth);

    const eyeWidth = bodyWidth * 1.2;
    const eyeHeight = scale * 0.04;
    drawBox(buffer, context, screenX, centerY - bodyHeight * 0.2 - verticalBob,
      eyeWidth, eyeHeight, this.enemy.eyeColor, shade, p.depth);
  }
}

export class BodyPartRenderer implements RenderableObject {
  constructor(public part: BodyPart, public playerPos: Vector3) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const dist = this.part.position.distanceTo(this.playerPos);
    if (dist < 0.1) return;

    const p = project(this.part.position, context);
    if (!p) return;

    const scale = (context.height * this.part.size * 2) / p.depth;
    const shade = Math.max(0.3, 1 - p.depth / 200);

    const rotPhase = this.part.rotationX + this.part.rotationY;
    const wobble = Math.sin(rotPhase) * scale * 0.2;

    drawBox(buffer, context, p.x + wobble, p.y, scale, scale,
      this.part.color, shade, p.depth);
  }
}

export class HitParticleRenderer implements RenderableObject {
  constructor(public particle: HitParticle, public playerPos: Vector3) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const dist = this.particle.position.distanceTo(this.playerPos);
    if (dist < 0.1) return;

    const p = project(this.particle.position, context);
    if (!p) return;

    const scale = (context.height * this.particle.size * 1.5) / p.depth;
    drawBox(buffer, context, p.x, p.y, scale, scale,
      this.particle.color, 1.0, p.depth);
  }
}

export class ChaingunRenderer implements RenderableObject {
  constructor(public chaingun: Chaingun) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const width = context.width;
    const height = context.height;
    const centerX = width / 2;
    const baseY = height * 0.92;

    const [bobX, bobY, bobZ] = this.chaingun.getOffset();
    const gunScale = width * 0.25;

    const gunX = centerX + bobX * width * 0.5;
    const gunY = baseY + bobY * height * 0.5 - bobZ * height * 0.3;

    const rotation = this.chaingun.barrelRotation;
    const perspectiveSquash = 0.4;

    const bodyRadius = gunScale * 0.35;
    const bodyLength = gunScale * 0.8;
    const barrelRadius = gunScale * 0.08;
    const barrelCircleRadius = gunScale * 0.22;

    drawEllipse(buffer, context, gunX, gunY + bodyLength * perspectiveSquash, bodyRadius, bodyRadius * perspectiveSquash,
      [60, 60, 70], [80, 80, 90]);

    drawGunBody(buffer, context, gunX, gunY, bodyRadius, bodyLength * perspectiveSquash, perspectiveSquash,
      this.chaingun.bodyColor);

    const barrelPositions: Array<{ x: number; y: number; depth: number }> = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI / 4) + rotation;
      const bx = Math.cos(angle) * barrelCircleRadius;
      const by = Math.sin(angle) * barrelCircleRadius * perspectiveSquash;
      barrelPositions.push({ x: bx, y: by, depth: Math.sin(angle) });
    }
    barrelPositions.sort((a, b) => b.depth - a.depth);

    for (const bp of barrelPositions) {
      const barrelLength = gunScale * 0.5;
      const shade = 0.5 + 0.5 * (1 - bp.depth) / 2;
      const tubeColor: [number, number, number] = [
        Math.floor(this.chaingun.barrelColor[0] * shade),
        Math.floor(this.chaingun.barrelColor[1] * shade),
        Math.floor(this.chaingun.barrelColor[2] * shade),
      ];

      drawBarrelTube(buffer, context, gunX + bp.x, gunY + bp.y, barrelRadius, barrelLength, tubeColor);
    }

    drawEllipse(buffer, context, gunX, gunY, bodyRadius * 0.9, bodyRadius * perspectiveSquash * 0.9,
      this.chaingun.bodyColor, this.chaingun.highlightColor);

    for (const bp of barrelPositions) {
      const holeColor: [number, number, number] = [20, 20, 25];
      const highlightColor: [number, number, number] = [50, 50, 60];
      drawEllipse(buffer, context, gunX + bp.x, gunY + bp.y, barrelRadius * 0.9, barrelRadius * perspectiveSquash * 0.9,
        holeColor, highlightColor);
    }

    drawEllipse(buffer, context, gunX, gunY, barrelRadius * 1.2, barrelRadius * perspectiveSquash * 1.2,
      [90, 90, 100], this.chaingun.highlightColor);
  }
}

export class HUDRenderer implements RenderableObject {
  constructor(public player: Player) {}

  render(buffer: Uint8Array, context: RaycasterRenderContext): void {
    const width = context.width;
    const height = context.height;
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const size = 5;

    const offX = context.renderOffset ? context.renderOffset[0] : 0;
    const offY = context.renderOffset ? context.renderOffset[1] : 0;
    const scx = cx + offX;
    const scy = cy + offY;

    for (let i = -size; i <= size; i++) {
      if (scx + i >= 0 && scx + i < width && scy >= 0 && scy < height) {
        const idx = (Math.floor(scy) * width + Math.floor(scx + i)) * 4;
        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
      }
      if (scx >= 0 && scx < width && scy + i >= 0 && scy + i < height) {
        const idx = (Math.floor(scy + i) * width + Math.floor(scx)) * 4;
        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
      }
    }

    const barWidth = Math.floor(width * 0.2);
    const barHeight = 10;
    const barX = 10 + offX;
    const barY = height - barHeight - 10 + offY;
    const healthPercent = this.player.health / 100;

    for (let y = 0; y < barHeight; y++) {
      const sy = barY + y;
      if (sy < 0 || sy >= height) continue;
      for (let x = 0; x < barWidth; x++) {
        const sx = barX + x;
        if (sx < 0 || sx >= width) continue;

        const idx = (Math.floor(sy) * width + Math.floor(sx)) * 4;
        const filled = x / barWidth <= healthPercent;
        buffer[idx] = filled ? 200 : 50;
        buffer[idx + 1] = 50;
        buffer[idx + 2] = 50;
        buffer[idx + 3] = 200;
      }
    }
  }
}