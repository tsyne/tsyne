/**
 * Canvas rendering functions for Renderer3D
 * Renders 3D primitives to Tsyne canvas using canvas primitives
 */

import { Cosyne3dContext } from './context3d';
import { Primitive3D } from './primitives3d/base3d';
import { Sphere3D } from './primitives3d/sphere3d';
import { Box3D } from './primitives3d/box3d';
import { Plane3D } from './primitives3d/plane3d';
import { Cylinder3D } from './primitives3d/cylinder3d';
import { Camera } from './camera';
import { Vector3 } from './math3d';
import { LightManager, DirectionalLight, AmbientLight } from './light';
import { colorToHex, parseColor, ColorRGBA } from './material';
import { RenderItem, ScreenPoint } from './renderer3d-types';

/**
 * Render a Cosyne3D context to the app using canvas primitives
 */
export function renderToCanvas(ctx: Cosyne3dContext, app: any): void {
  const camera = ctx.getCamera();
  const width = ctx.getWidth();
  const height = ctx.getHeight();
  const lightManager = ctx.getLightManager();
  const primitives = ctx.getVisiblePrimitives();

  // Collect all render items with depth
  const renderItems: RenderItem[] = [];

  // Background
  const bgColor = ctx.getBackgroundColor();
  renderItems.push({
    depth: Infinity,
    render: (a) => {
      a.canvasRectangle({ x: 0, y: 0, x2: width, y2: height, fillColor: bgColor });
    },
  });

  // Process each primitive
  for (const primitive of primitives) {
    const items = processPrimitive(primitive, camera, width, height, lightManager);
    renderItems.push(...items);
  }

  // Sort by depth (back to front - painter's algorithm)
  renderItems.sort((a, b) => b.depth - a.depth);

  // Render all items
  for (const item of renderItems) {
    item.render(app);
  }
}

/**
 * Process a single primitive into render items
 */
function processPrimitive(
  primitive: Primitive3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): RenderItem[] {
  if (primitive instanceof Sphere3D) {
    return renderSphere(primitive, camera, width, height, lightManager);
  } else if (primitive instanceof Box3D) {
    return renderBox(primitive, camera, width, height, lightManager);
  } else if (primitive instanceof Plane3D) {
    return renderPlane(primitive, camera, width, height, lightManager);
  } else if (primitive instanceof Cylinder3D) {
    return renderCylinder(primitive, camera, width, height, lightManager);
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
 * Apply lighting to a base color
 */
function applyLightingToColor(
  baseColor: string,
  diffuse: number,
  ambient: number
): string {
  const parsed = parseColor(baseColor);
  const intensity = Math.min(1.0, Math.max(0.2, ambient + diffuse * 0.6));
  const lit: ColorRGBA = {
    r: Math.min(255, Math.round(parsed.r * intensity)),
    g: Math.min(255, Math.round(parsed.g * intensity)),
    b: Math.min(255, Math.round(parsed.b * intensity)),
    a: parsed.a,
  };
  return colorToHex(lit);
}

/**
 * Get the primary light direction for sphere rendering
 */
function getPrimaryLightDirection(lightManager: LightManager): [number, number, number] {
  const lights = lightManager.getLights();

  for (const light of lights) {
    if (light instanceof DirectionalLight && light.enabled) {
      const dir = light.direction;
      return [dir.x, dir.y, dir.z];
    }
  }

  // Default: light from upper-left-front
  return [-0.5, -0.7, -0.5];
}

/**
 * Render a sphere primitive
 */
function renderSphere(
  sphere: Sphere3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): RenderItem[] {
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
  const baseColor = material.color;
  const emissive = material.emissive;
  const emissiveIntensity = material.emissiveIntensity;

  const lightDir = getPrimaryLightDirection(lightManager);

  let ambientIntensity = 0.2;
  for (const light of lightManager.getLights()) {
    if (light instanceof AmbientLight && light.enabled) {
      ambientIntensity = Math.max(ambientIntensity, light.intensity);
    }
  }

  const depth = camera.position.distanceTo(worldPos);

  return [{
    depth,
    render: (a) => {
      let finalColor = baseColor;
      if (emissiveIntensity > 0 && emissive !== '#000000') {
        const baseParsed = parseColor(baseColor);
        const emissiveParsed = parseColor(emissive);
        const blended: ColorRGBA = {
          r: Math.min(255, baseParsed.r * (1 - emissiveIntensity) + emissiveParsed.r * emissiveIntensity),
          g: Math.min(255, baseParsed.g * (1 - emissiveIntensity) + emissiveParsed.g * emissiveIntensity),
          b: Math.min(255, baseParsed.b * (1 - emissiveIntensity) + emissiveParsed.b * emissiveIntensity),
          a: 255,
        };
        finalColor = colorToHex(blended);
      }

      a.canvasSphere({
        cx: screenPos.x,
        cy: screenPos.y,
        radius: screenRadius,
        pattern: 'solid',
        solidColor: finalColor,
        latBands: 16,
        lonSegments: 16,
        lighting: {
          direction: { x: lightDir[0], y: lightDir[1], z: lightDir[2] },
          ambient: ambientIntensity,
          diffuse: material.unlit ? 0 : 0.8,
        },
      });
    },
  }];
}

/**
 * Render a box primitive
 */
function renderBox(
  box: Box3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): RenderItem[] {
  const items: RenderItem[] = [];
  const faces: Array<'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'> = [
    'front', 'back', 'left', 'right', 'top', 'bottom',
  ];

  const material = box.material;
  const baseColor = material.color;

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
    const litColor = applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);

    const depth = camera.position.distanceTo(faceCenter);
    const finalColor = litColor;
    const finalPoints = screenPoints.map(p => ({ x: p.x, y: p.y }));

    items.push({
      depth,
      render: (a) => {
        a.canvasPolygon({
          points: finalPoints,
          fillColor: finalColor,
          strokeColor: finalColor,
          strokeWidth: 0,
        });
      },
    });
  }

  return items;
}

/**
 * Render a plane primitive
 */
function renderPlane(
  plane: Plane3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): RenderItem[] {
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
  const lighting = calculateLighting(worldPos, effectiveNormal, camera, lightManager);
  const litColor = applyLightingToColor(material.color, lighting.diffuse, lighting.ambient);

  const depth = camera.position.distanceTo(worldPos);

  return [{
    depth,
    render: (a) => {
      a.canvasPolygon({
        points: screenPoints.map(p => ({ x: p.x, y: p.y })),
        fillColor: litColor,
        strokeColor: litColor,
        strokeWidth: 0,
      });
    },
  }];
}

/**
 * Render a cylinder primitive
 */
function renderCylinder(
  cylinder: Cylinder3D,
  camera: Camera,
  width: number,
  height: number,
  lightManager: LightManager
): RenderItem[] {
  const items: RenderItem[] = [];
  const worldMatrix = cylinder.getWorldMatrix();

  const material = cylinder.material;
  const baseColor = material.color;

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
        const litColor = applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);
        const depth = camera.position.distanceTo(topCenter);
        const points = screenPoints.map(p => ({ x: p.x, y: p.y }));

        items.push({
          depth,
          render: (a) => {
            a.canvasPolygon({
              points,
              fillColor: litColor,
              strokeColor: litColor,
              strokeWidth: 0,
            });
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
        const litColor = applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);
        const depth = camera.position.distanceTo(bottomCenter);
        const points = screenPoints.map(p => ({ x: p.x, y: p.y }));

        items.push({
          depth,
          render: (a) => {
            a.canvasPolygon({
              points,
              fillColor: litColor,
              strokeColor: litColor,
              strokeWidth: 0,
            });
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
    const litColor = applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);
    const depth = camera.position.distanceTo(faceCenter);
    const points = screenPoints.map(p => ({ x: p.x, y: p.y }));

    items.push({
      depth,
      render: (a) => {
        a.canvasPolygon({
          points,
          fillColor: litColor,
          strokeColor: litColor,
          strokeWidth: 0,
        });
      },
    });
  }

  return items;
}
