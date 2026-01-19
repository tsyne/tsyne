/**
 * Renderer3D - Software renderer for Cosyne 3D scenes
 *
 * Renders 3D primitives to Tsyne's 2D canvas using projection
 * and the existing canvas primitives (canvasSphere, canvasPolygon, etc.)
 */

import { Cosyne3dContext } from './context3d';
import { Primitive3D } from './primitives3d/base3d';
import { Sphere3D } from './primitives3d/sphere3d';
import { Box3D } from './primitives3d/box3d';
import { Plane3D } from './primitives3d/plane3d';
import { Cylinder3D } from './primitives3d/cylinder3d';
import { Camera } from './camera';
import { Vector3 } from './math3d';
import { LightManager, Light, DirectionalLight, PointLight, AmbientLight } from './light';
import { colorToHex, parseColor, ColorRGBA, applyLighting } from './material';

// Import software rasterizer
import {
  RenderTarget,
  createRenderTarget,
  clearRenderTarget,
} from '../../core/src/graphics/platform';
import {
  drawCircle as rasterDrawCircle,
  fillPolygon as rasterFillPolygon,
  fillRect as rasterFillRect,
  parseColor as rasterParseColor,
  Color as RasterColor,
} from '../../core/src/graphics/rasterizer';

/**
 * A renderable item with depth information
 */
interface RenderItem {
  depth: number;
  render: (app: any) => void;
}

/**
 * A renderable item for buffer rendering
 */
interface BufferRenderItem {
  depth: number;
  renderToBuffer: (target: RenderTarget) => void;
}

/**
 * Screen-space projection of a point
 */
interface ScreenPoint {
  x: number;
  y: number;
  z: number; // NDC depth for visibility check
  visible: boolean;
}

/**
 * Renderer3D class - renders Cosyne3D scenes to Tsyne canvas primitives
 */
export class Renderer3D {
  /**
   * Render a Cosyne3D context to the app using canvas primitives
   */
  render(ctx: Cosyne3dContext, app: any): void {
    const camera = ctx.getCamera();
    const width = ctx.getWidth();
    const height = ctx.getHeight();
    const lightManager = ctx.getLightManager();
    const primitives = ctx.getVisiblePrimitives();

    // Collect all render items with depth
    const renderItems: RenderItem[] = [];

    // Background - use x2/y2 instead of width/height for NewWithoutLayout containers
    const bgColor = ctx.getBackgroundColor();
    renderItems.push({
      depth: Infinity, // Draw first (furthest)
      render: (a) => {
        a.canvasRectangle({ x: 0, y: 0, x2: width, y2: height, fillColor: bgColor });
      },
    });

    // Process each primitive
    for (const primitive of primitives) {
      const items = this.processPrimitive(primitive, camera, width, height, lightManager);
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
   * Render a Cosyne3D context to a pixel buffer (software rendering)
   * Use this for high-frequency animation to avoid widget creation overhead.
   *
   * @param ctx - The Cosyne3D context to render
   * @param target - Optional existing RenderTarget to reuse (for performance)
   * @returns The pixel buffer as a Uint8Array (RGBA format)
   */
  renderToBuffer(ctx: Cosyne3dContext, target?: RenderTarget): Uint8Array {
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
      const items = this.processPrimitiveToBuffer(primitive, camera, width, height, lightManager);
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
  private processPrimitiveToBuffer(
    primitive: Primitive3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): BufferRenderItem[] {
    if (primitive instanceof Sphere3D) {
      return this.renderSphereToBuffer(primitive, camera, width, height, lightManager);
    } else if (primitive instanceof Box3D) {
      return this.renderBoxToBuffer(primitive, camera, width, height, lightManager);
    } else if (primitive instanceof Plane3D) {
      return this.renderPlaneToBuffer(primitive, camera, width, height, lightManager);
    } else if (primitive instanceof Cylinder3D) {
      return this.renderCylinderToBuffer(primitive, camera, width, height, lightManager);
    }
    return [];
  }

  /**
   * Render a sphere to buffer
   */
  private renderSphereToBuffer(
    sphere: Sphere3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): BufferRenderItem[] {
    const worldPos = sphere.getWorldPosition();
    const screenPos = this.projectToScreen(worldPos, camera, width, height);

    if (!screenPos.visible) {
      return [];
    }

    const scale = sphere.scale;
    const avgScale = (scale.x + scale.y + scale.z) / 3;
    const worldRadius = sphere.radius * avgScale;
    const screenRadius = this.calculateScreenRadius(worldPos, worldRadius, camera, width, height);

    if (screenRadius < 1) {
      return [];
    }

    const material = sphere.material;
    const baseColor = rasterParseColor(material.color);
    const depth = camera.position.distanceTo(worldPos);

    // Calculate simple lighting
    const normal = camera.position.sub(worldPos).normalize();
    const lighting = this.calculateLighting(worldPos, normal, camera, lightManager);
    const litColor = this.applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);

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
  private renderBoxToBuffer(
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
        this.projectToScreen(v, camera, width, height)
      );

      if (screenPoints.some(p => !p.visible)) {
        continue;
      }

      const lighting = this.calculateLighting(faceCenter, worldNormal, camera, lightManager);
      const litColor = this.applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
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
  private renderPlaneToBuffer(
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
      this.projectToScreen(v, camera, width, height)
    );

    if (screenPoints.every(p => !p.visible)) {
      return [];
    }

    const material = plane.material;
    const baseColor = rasterParseColor(material.color);
    const lighting = this.calculateLighting(worldPos, effectiveNormal, camera, lightManager);
    const litColor = this.applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
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
  private renderCylinderToBuffer(
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
        const screenPoints = topVertices.map(v => this.projectToScreen(v, camera, width, height));
        if (screenPoints.some(p => p.visible)) {
          const lighting = this.calculateLighting(topCenter, worldNormal, camera, lightManager);
          const litColor = this.applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
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
        const screenPoints = bottomVertices.map(v => this.projectToScreen(v, camera, width, height)).reverse();
        if (screenPoints.some(p => p.visible)) {
          const lighting = this.calculateLighting(bottomCenter, worldNormal, camera, lightManager);
          const litColor = this.applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
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

      const screenPoints = quadVertices.map(v => this.projectToScreen(v, camera, width, height));
      if (screenPoints.every(p => !p.visible)) {
        continue;
      }

      const lighting = this.calculateLighting(faceCenter, worldNormal, camera, lightManager);
      const litColor = this.applyLightingToRasterColor(baseColor, lighting.diffuse, lighting.ambient);
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

  /**
   * Apply lighting to a RasterColor
   */
  private applyLightingToRasterColor(
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
   * Process a single primitive into render items
   */
  private processPrimitive(
    primitive: Primitive3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): RenderItem[] {
    if (primitive instanceof Sphere3D) {
      return this.renderSphere(primitive, camera, width, height, lightManager);
    } else if (primitive instanceof Box3D) {
      return this.renderBox(primitive, camera, width, height, lightManager);
    } else if (primitive instanceof Plane3D) {
      return this.renderPlane(primitive, camera, width, height, lightManager);
    } else if (primitive instanceof Cylinder3D) {
      return this.renderCylinder(primitive, camera, width, height, lightManager);
    }
    return [];
  }

  /**
   * Project a 3D world point to screen coordinates
   */
  private projectToScreen(
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
  private calculateScreenRadius(
    center: Vector3,
    radius: number,
    camera: Camera,
    width: number,
    height: number
  ): number {
    // Project center
    const centerScreen = camera.projectToPixel(center, width, height);

    // Project a point at the edge of the sphere (in screen-space)
    // We use a point perpendicular to the view direction
    const forward = camera.getForward();
    const right = camera.getRight();
    const edgePoint = center.add(right.multiplyScalar(radius));
    const edgeScreen = camera.projectToPixel(edgePoint, width, height);

    // Screen radius is the distance between center and edge in screen space
    const dx = edgeScreen.x - centerScreen.x;
    const dy = edgeScreen.y - centerScreen.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate lighting at a point on a surface
   */
  private calculateLighting(
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
  private applyLightingToColor(
    baseColor: string,
    diffuse: number,
    ambient: number
  ): string {
    const parsed = parseColor(baseColor);
    // Clamp intensity to reasonable range - ambient provides base, diffuse adds on top
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
  private getPrimaryLightDirection(lightManager: LightManager): [number, number, number] {
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
  private renderSphere(
    sphere: Sphere3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): RenderItem[] {
    const worldPos = sphere.getWorldPosition();
    const screenPos = this.projectToScreen(worldPos, camera, width, height);

    if (!screenPos.visible) {
      return [];
    }

    // Calculate screen radius with scale
    const scale = sphere.scale;
    const avgScale = (scale.x + scale.y + scale.z) / 3;
    const worldRadius = sphere.radius * avgScale;
    const screenRadius = this.calculateScreenRadius(worldPos, worldRadius, camera, width, height);

    // Skip if too small
    if (screenRadius < 1) {
      return [];
    }

    // Get material properties
    const material = sphere.material;
    const baseColor = material.color;
    const emissive = material.emissive;
    const emissiveIntensity = material.emissiveIntensity;

    // Get light direction for canvasSphere lighting
    const lightDir = this.getPrimaryLightDirection(lightManager);

    // Calculate ambient from scene lights
    let ambientIntensity = 0.2;
    for (const light of lightManager.getLights()) {
      if (light instanceof AmbientLight && light.enabled) {
        ambientIntensity = Math.max(ambientIntensity, light.intensity);
      }
    }

    // Depth for sorting (distance from camera)
    const depth = camera.position.distanceTo(worldPos);

    return [{
      depth,
      render: (a) => {
        // Use canvasSphere with solid pattern and lighting
        // If material has emissive, use that for a glow effect
        let finalColor = baseColor;
        if (emissiveIntensity > 0 && emissive !== '#000000') {
          // Blend base color with emissive for emissive materials (like the sun)
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
  private renderBox(
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

    // Face normals in local space
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

      // Transform normal to world space
      const localNormal = faceNormals[face];
      const worldNormal = localNormal.applyMatrix4(box.getWorldMatrix().extractRotation()).normalize();

      // Back-face culling: skip if face points away from camera
      const toCamera = camera.position.sub(faceCenter).normalize();
      if (worldNormal.dot(toCamera) < 0) {
        continue;
      }

      // Project vertices to screen
      const screenPoints: ScreenPoint[] = vertices.map(v =>
        this.projectToScreen(v, camera, width, height)
      );

      // Skip if any vertex is behind camera
      if (screenPoints.some(p => !p.visible)) {
        continue;
      }

      // Calculate lighting for this face
      const lighting = this.calculateLighting(faceCenter, worldNormal, camera, lightManager);
      const litColor = this.applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);

      // Depth from face center
      const depth = camera.position.distanceTo(faceCenter);

      // Capture values for closure
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
  private renderPlane(
    plane: Plane3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): RenderItem[] {
    const corners = plane.getCorners();
    const worldNormal = plane.getWorldNormal();
    const worldPos = plane.getWorldPosition();

    // Back-face culling
    const toCamera = camera.position.sub(worldPos).normalize();
    const facingCamera = worldNormal.dot(toCamera);

    // For planes, we might want to see both sides
    const effectiveNormal = facingCamera >= 0 ? worldNormal : worldNormal.negate();

    // Project corners to screen
    const screenPoints: ScreenPoint[] = corners.map(v =>
      this.projectToScreen(v, camera, width, height)
    );

    // Skip if all vertices are behind camera
    if (screenPoints.every(p => !p.visible)) {
      return [];
    }

    // Calculate lighting
    const material = plane.material;
    const lighting = this.calculateLighting(worldPos, effectiveNormal, camera, lightManager);
    const litColor = this.applyLightingToColor(material.color, lighting.diffuse, lighting.ambient);

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
   * Render a cylinder primitive using proper world-space transformation
   * Renders top and bottom caps as filled polygons, and the curved surface
   * as a series of quads.
   */
  private renderCylinder(
    cylinder: Cylinder3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): RenderItem[] {
    const items: RenderItem[] = [];
    const worldMatrix = cylinder.getWorldMatrix();
    const worldPos = cylinder.getWorldPosition();

    const material = cylinder.material;
    const baseColor = material.color;

    const halfHeight = cylinder.height / 2;
    const radiusTop = cylinder.radiusTop;
    const radiusBottom = cylinder.radiusBottom;
    const segments = Math.max(16, cylinder.radialSegments);

    // Generate cap vertices in local space, then transform to world space
    const generateCapVertices = (y: number, radius: number): Vector3[] => {
      const vertices: Vector3[] = [];
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        // Transform local point to world space
        const localPoint = new Vector3(x, y, z);
        vertices.push(localPoint.applyMatrix4(worldMatrix));
      }
      return vertices;
    };

    // Top cap (if not open-ended and radius > 0)
    if (!cylinder.openEnded && radiusTop > 0) {
      const topVertices = generateCapVertices(halfHeight, radiusTop);
      const topCenter = new Vector3(0, halfHeight, 0).applyMatrix4(worldMatrix);

      // Calculate normal for top cap (local Y+ transformed to world)
      const localNormal = new Vector3(0, 1, 0);
      const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

      // Back-face culling
      const toCamera = camera.position.sub(topCenter).normalize();
      if (worldNormal.dot(toCamera) >= 0) {
        // Project all vertices
        const screenPoints = topVertices.map(v => this.projectToScreen(v, camera, width, height));

        // Check if visible
        if (screenPoints.some(p => p.visible)) {
          const lighting = this.calculateLighting(topCenter, worldNormal, camera, lightManager);
          const litColor = this.applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);
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

    // Bottom cap (if not open-ended and radius > 0)
    if (!cylinder.openEnded && radiusBottom > 0) {
      const bottomVertices = generateCapVertices(-halfHeight, radiusBottom);
      const bottomCenter = new Vector3(0, -halfHeight, 0).applyMatrix4(worldMatrix);

      // Calculate normal for bottom cap (local Y- transformed to world)
      const localNormal = new Vector3(0, -1, 0);
      const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

      // Back-face culling
      const toCamera = camera.position.sub(bottomCenter).normalize();
      if (worldNormal.dot(toCamera) >= 0) {
        // Project all vertices - reverse order for correct winding
        const screenPoints = bottomVertices.map(v => this.projectToScreen(v, camera, width, height)).reverse();

        // Check if visible
        if (screenPoints.some(p => p.visible)) {
          const lighting = this.calculateLighting(bottomCenter, worldNormal, camera, lightManager);
          const litColor = this.applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);
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

    // Curved surface - render as quads between top and bottom rings
    const topVertices = generateCapVertices(halfHeight, radiusTop);
    const bottomVertices = generateCapVertices(-halfHeight, radiusBottom);

    for (let i = 0; i < segments; i++) {
      const nextI = (i + 1) % segments;

      // Quad vertices: top[i], top[next], bottom[next], bottom[i]
      const quadVertices = [
        topVertices[i],
        topVertices[nextI],
        bottomVertices[nextI],
        bottomVertices[i],
      ];

      // Calculate face center and normal
      const faceCenter = quadVertices.reduce((acc, v) => acc.add(v), new Vector3(0, 0, 0)).multiplyScalar(0.25);

      // Normal is perpendicular to cylinder axis, pointing outward
      // Use the midpoint of the quad's horizontal position
      const midAngle = ((i + 0.5) / segments) * Math.PI * 2;
      const localNormal = new Vector3(Math.cos(midAngle), 0, Math.sin(midAngle));
      const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

      // Back-face culling
      const toCamera = camera.position.sub(faceCenter).normalize();
      if (worldNormal.dot(toCamera) < 0) {
        continue;
      }

      // Project vertices
      const screenPoints = quadVertices.map(v => this.projectToScreen(v, camera, width, height));

      // Skip if all behind camera
      if (screenPoints.every(p => !p.visible)) {
        continue;
      }

      const lighting = this.calculateLighting(faceCenter, worldNormal, camera, lightManager);
      const litColor = this.applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);
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
}

/**
 * Default renderer instance
 */
export const renderer3d = new Renderer3D();
