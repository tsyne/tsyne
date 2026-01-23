/**
 * Buffer rendering functions for Renderer3D
 * Renders 3D primitives to pixel buffers using software rasterization
 */

import { Cosyne3dContext } from './context3d';
import { Primitive3D } from './primitives3d/base3d';
import { Sphere3D } from './primitives3d/sphere3d';
import { Box3D } from './primitives3d/box3d';
import { Plane3D } from './primitives3d/plane3d';
import { Cylinder3D } from './primitives3d/cylinder3d';
import { Camera } from './camera';
import { Vector3 } from './math3d';
import { LightManager } from './light';
import { BufferRenderItem, ScreenPoint } from './renderer3d-types';

import {
  RenderTarget,
  createRenderTarget,
  clearRenderTarget,
} from '../../core/dist/src/graphics/platform';
import {
  drawCircle as rasterDrawCircle,
  fillPolygon as rasterFillPolygon,
  parseColor as rasterParseColor,
  Color as RasterColor,
} from '../../core/dist/src/graphics/rasterizer';

/**
 * Render a Cosyne3D context to a pixel buffer (software rendering)
 * Use this for high-frequency animation to avoid widget creation overhead.
 *
 * @param ctx - The Cosyne3D context to render
 * @param target - Optional existing RenderTarget to reuse (for performance)
 * @returns The pixel buffer as a Uint8Array (RGBA format)
 */
export function renderToBuffer(ctx: Cosyne3dContext, target?: RenderTarget): Uint8Array {
  const camera = ctx.getCamera();
  const width = ctx.getWidth();
  const height = ctx.getHeight();
  const lightManager = ctx.getLightManager();
  const primitives = ctx.getVisiblePrimitives();

  // Create or reuse render target
  const renderTarget = target || createRenderTarget(width, height);

  // Clear to background color
  const bgColor = rasterParseColor(ctx.getBackgroundColor());
  clearRenderTarget(renderTarget, bgColor.r, bgColor.g, bgColor.b, bgColor.a);

  // Collect all render items with depth
  const bufferItems: BufferRenderItem[] = [];

  // Process each primitive
  for (const primitive of primitives) {
    const items = processPrimitiveToBuffer(primitive, camera, width, height, lightManager);
    bufferItems.push(...items);
  }

  // Sort by depth (back to front - painter's algorithm)
  bufferItems.sort((a, b) => b.depth - a.depth);

  // Render all items to buffer
  for (const item of bufferItems) {
    item.renderToBuffer(renderTarget);
  }

  return renderTarget.pixels;
}

/**
 * Process a primitive for buffer rendering
 */
function processPrimitiveToBuffer(
  primitive: Primitive3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): BufferRenderItem[] {
  if (primitive instanceof Sphere3D) {
    return renderSphereToBuffer(primitive, camera, width, height, lightManager);
  } else if (primitive instanceof Box3D) {
    return renderBoxToBuffer(primitive, camera, width, height, lightManager);
  } else if (primitive instanceof Plane3D) {
    return renderPlaneToBuffer(primitive, camera, width, height, lightManager);
  } else if (primitive instanceof Cylinder3D) {
    return renderCylinderToBuffer(primitive, camera, width, height, lightManager);
  }
  return [];
}

/**
 * Project a 3D world point to screen coordinates
 */
function projectToScreen(
  point: Vector3,
  camera: Camera,
  width: number,
  height: number
): ScreenPoint {
  const projected = camera.projectToPixel(point, width, height);
  const ndc = camera.projectToNDC(point);

  return {
    x: projected.x,
    y: projected.y,
    z: ndc.z,
    visible: ndc.z >= -1 && ndc.z <= 1,
  };
}

/**
 * Calculate perspective-correct screen radius for a sphere
 */
function calculateScreenRadius(
  center: Vector3,
  radius: number,
  camera: Camera,
  width: number,
  height: number
): number {
  const centerScreen = camera.projectToPixel(center, width, height);
  const right = camera.getRight();
  const edgePoint = center.add(right.multiplyScalar(radius));
  const edgeScreen = camera.projectToPixel(edgePoint, width, height);

  const dx = edgeScreen.x - centerScreen.x;
  const dy = edgeScreen.y - centerScreen.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate lighting at a point on a surface
 */
function calculateLighting(
  point: Vector3,
  normal: Vector3,
  camera: Camera,
  lightManager: LightManager
): { diffuse: number; ambient: number } {
  const viewDir = camera.position.sub(point).normalize();
  const lighting = lightManager.calculateLightingAt(point, normal, viewDir);
  return {
    diffuse: lighting.diffuse,
    ambient: lighting.ambient,
  };
}

/**
 * Apply lighting to a RasterColor
 */
function applyLightingToRasterColor(
  baseColor: RasterColor,
  diffuse: number,
  ambient: number
): RasterColor {
  const intensity = Math.min(1.0, Math.max(0.2, ambient + diffuse * 0.6));
  return {
    r: Math.min(255, Math.round(baseColor.r * intensity)),
    g: Math.min(255, Math.round(baseColor.g * intensity)),
    b: Math.min(255, Math.round(baseColor.b * intensity)),
    a: baseColor.a,
  };
}

/**
 * Render a sphere to buffer
 */
function renderSphereToBuffer(
  sphere: Sphere3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): BufferRenderItem[] {
  const worldPos = sphere.getWorldPosition();
  const screenPos = projectToScreen(worldPos, camera, width, height);

  if (!screenPos.visible) {
    return [];
  }

  const scale = sphere.scale;
  const avgScale = (scale.x + scale.y + scale.z) / 3;
  const worldRadius = sphere.radius * avgScale;
  const screenRadius = calculateScreenRadius(worldPos, worldRadius, camera, width, height);

  if (screenRadius < 1) {
    return [];
  }

  const material = sphere.material;
  const baseColor = rasterParseColor(material.color);
  const depth = camera.position.distanceTo(worldPos);

  const normal = camera.position.sub(worldPos).normalize();
  const lighting = calculateLighting(worldPos, normal, camera, lightManager);
  const litColor = applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);

  return [{
    depth,
    renderToBuffer: (target: RenderTarget) => {
      rasterDrawCircle(target, screenPos.x, screenPos.y, screenRadius, litColor, true);
    },
  }];
}

/**
 * Render a box to buffer
 */
function renderBoxToBuffer(
  box: Box3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): BufferRenderItem[] {
  const items: BufferRenderItem[] = [];
  const faces: Array<'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'> = [
    'front', 'back', 'left', 'right', 'top', 'bottom',
  ];

  const material = box.material;
  const baseColor = rasterParseColor(material.color);

  const faceNormals: Record<string, Vector3> = {
    front: new Vector3(0, 0, 1),
    back: new Vector3(0, 0, -1),
    left: new Vector3(-1, 0, 0),
    right: new Vector3(1, 0, 0),
    top: new Vector3(0, 1, 0),
    bottom: new Vector3(0, -1, 0),
  };

  for (const face of faces) {
    const vertices = box.getFaceVertices(face);
    const faceCenter = box.getFaceCenter(face);

    const localNormal = faceNormals[face];
    const worldNormal = localNormal.applyMatrix4(box.getWorldMatrix().extractRotation()).normalize();

    const toCamera = camera.position.sub(faceCenter).normalize();
    if (worldNormal.dot(toCamera) < 0) {
      continue;
    }

    const screenPoints: ScreenPoint[] = vertices.map(v =>
      projectToScreen(v, camera, width, height)
    );

    if (screenPoints.some(p => !p.visible)) {
      continue;
    }

    const lighting = calculateLighting(faceCenter, worldNormal, camera, lightManager);
    const litColor = applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
    const depth = camera.position.distanceTo(faceCenter);
    const finalPoints = screenPoints.map(p => ({ x: p.x, y: p.y }));

    items.push({
      depth,
      renderToBuffer: (target: RenderTarget) => {
        rasterFillPolygon(target, finalPoints, litColor);
      },
    });
  }

  return items;
}

/**
 * Render a plane to buffer
 */
function renderPlaneToBuffer(
  plane: Plane3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): BufferRenderItem[] {
  const corners = plane.getCorners();
  const worldNormal = plane.getWorldNormal();
  const worldPos = plane.getWorldPosition();

  const toCamera = camera.position.sub(worldPos).normalize();
  const facingCamera = worldNormal.dot(toCamera);
  const effectiveNormal = facingCamera >= 0 ? worldNormal : worldNormal.negate();

  const screenPoints: ScreenPoint[] = corners.map(v =>
    projectToScreen(v, camera, width, height)
  );

  if (screenPoints.every(p => !p.visible)) {
    return [];
  }

  const material = plane.material;
  const baseColor = rasterParseColor(material.color);
  const lighting = calculateLighting(worldPos, effectiveNormal, camera, lightManager);
  const litColor = applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
  const depth = camera.position.distanceTo(worldPos);

  return [{
    depth,
    renderToBuffer: (target: RenderTarget) => {
      rasterFillPolygon(target, screenPoints.map(p => ({ x: p.x, y: p.y })), litColor);
    },
  }];
}

/**
 * Render a cylinder to buffer
 */
function renderCylinderToBuffer(
  cylinder: Cylinder3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): BufferRenderItem[] {
  const items: BufferRenderItem[] = [];
  const worldMatrix = cylinder.getWorldMatrix();
  const material = cylinder.material;
  const baseColor = rasterParseColor(material.color);

  const halfHeight = cylinder.height / 2;
  const radiusTop = cylinder.radiusTop;
  const radiusBottom = cylinder.radiusBottom;
  const segments = Math.max(16, cylinder.radialSegments);

  const generateCapVertices = (y: number, radius: number): Vector3[] => {
    const vertices: Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const localPoint = new Vector3(x, y, z);
      vertices.push(localPoint.applyMatrix4(worldMatrix));
    }
    return vertices;
  };

  // Top cap
  if (!cylinder.openEnded && radiusTop > 0) {
    const topVertices = generateCapVertices(halfHeight, radiusTop);
    const topCenter = new Vector3(0, halfHeight, 0).applyMatrix4(worldMatrix);
    const localNormal = new Vector3(0, 1, 0);
    const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();
    const toCamera = camera.position.sub(topCenter).normalize();

    if (worldNormal.dot(toCamera) >= 0) {
      const screenPoints = topVertices.map(v => projectToScreen(v, camera, width, height));
      if (screenPoints.some(p => p.visible)) {
        const lighting = calculateLighting(topCenter, worldNormal, camera, lightManager);
        const litColor = applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
        const depth = camera.position.distanceTo(topCenter);
        const points = screenPoints.map(p => ({ x: p.x, y: p.y }));
        items.push({
          depth,
          renderToBuffer: (target: RenderTarget) => {
            rasterFillPolygon(target, points, litColor);
          },
        });
      }
    }
  }

  // Bottom cap
  if (!cylinder.openEnded && radiusBottom > 0) {
    const bottomVertices = generateCapVertices(-halfHeight, radiusBottom);
    const bottomCenter = new Vector3(0, -halfHeight, 0).applyMatrix4(worldMatrix);
    const localNormal = new Vector3(0, -1, 0);
    const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();
    const toCamera = camera.position.sub(bottomCenter).normalize();

    if (worldNormal.dot(toCamera) >= 0) {
      const screenPoints = bottomVertices.map(v => projectToScreen(v, camera, width, height)).reverse();
      if (screenPoints.some(p => p.visible)) {
        const lighting = calculateLighting(bottomCenter, worldNormal, camera, lightManager);
        const litColor = applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
        const depth = camera.position.distanceTo(bottomCenter);
        const points = screenPoints.map(p => ({ x: p.x, y: p.y }));
        items.push({
          depth,
          renderToBuffer: (target: RenderTarget) => {
            rasterFillPolygon(target, points, litColor);
          },
        });
      }
    }
  }

  // Curved surface quads
  const topVertices = generateCapVertices(halfHeight, radiusTop);
  const bottomVertices = generateCapVertices(-halfHeight, radiusBottom);

  for (let i = 0; i < segments; i++) {
    const nextI = (i + 1) % segments;
    const quadVertices = [
      topVertices[i], topVertices[nextI],
      bottomVertices[nextI], bottomVertices[i],
    ];

    const faceCenter = quadVertices.reduce((acc, v) => acc.add(v), new Vector3(0, 0, 0)).multiplyScalar(0.25);
    const midAngle = ((i + 0.5) / segments) * Math.PI * 2;
    const localNormal = new Vector3(Math.cos(midAngle), 0, Math.sin(midAngle));
    const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

    const toCamera = camera.position.sub(faceCenter).normalize();
    if (worldNormal.dot(toCamera) < 0) {
      continue;
    }

    const screenPoints = quadVertices.map(v => projectToScreen(v, camera, width, height));
    if (screenPoints.every(p => !p.visible)) {
      continue;
    }

    const lighting = calculateLighting(faceCenter, worldNormal, camera, lightManager);
    const litColor = applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
    const depth = camera.position.distanceTo(faceCenter);
    const points = screenPoints.map(p => ({ x: p.x, y: p.y }));

    items.push({
      depth,
      renderToBuffer: (target: RenderTarget) => {
        rasterFillPolygon(target, points, litColor);
      },
    });
  }

  return items;
}
