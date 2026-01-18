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

/**
 * A renderable item with depth information
 */
interface RenderItem {
  depth: number;
  render: (app: any) => void;
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

    // Background
    const bgColor = ctx.getBackgroundColor();
    renderItems.push({
      depth: Infinity, // Draw first (furthest)
      render: (a) => {
        a.canvasRect({ x: 0, y: 0, width, height, color: bgColor });
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
    const intensity = Math.min(1.5, ambient + diffuse);
    const lit: ColorRGBA = {
      r: Math.min(255, parsed.r * intensity),
      g: Math.min(255, parsed.g * intensity),
      b: Math.min(255, parsed.b * intensity),
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
            direction: lightDir,
            ambient: ambientIntensity,
            diffuse: material.unlit ? 0 : 0.8,
            specular: material.shininess * 0.5,
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

      items.push({
        depth,
        render: (a) => {
          a.canvasPolygon({
            points: screenPoints.map(p => ({ x: p.x, y: p.y })),
            fillColor: litColor,
            strokeColor: litColor, // No outline for smooth look
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
   * Render a cylinder primitive (approximated as a series of rectangles)
   */
  private renderCylinder(
    cylinder: Cylinder3D,
    camera: Camera,
    width: number,
    height: number,
    lightManager: LightManager
  ): RenderItem[] {
    // Approximate cylinder with line segments forming its outline
    const items: RenderItem[] = [];
    const worldPos = cylinder.getWorldPosition();
    const screenPos = this.projectToScreen(worldPos, camera, width, height);

    if (!screenPos.visible) {
      return [];
    }

    const material = cylinder.material;
    const baseColor = material.color;

    // Simple approximation: render as a vertical rectangle from the side
    // For a more complete implementation, we'd render the curved surface
    // with multiple quads

    const scale = cylinder.scale;
    const worldRadius = cylinder.radiusTop * Math.max(scale.x, scale.z);
    const worldHeight = cylinder.height * scale.y;

    // Calculate screen dimensions
    const screenRadius = this.calculateScreenRadius(worldPos, worldRadius, camera, width, height);
    const topPoint = worldPos.add(new Vector3(0, worldHeight / 2, 0));
    const bottomPoint = worldPos.add(new Vector3(0, -worldHeight / 2, 0));
    const topScreen = this.projectToScreen(topPoint, camera, width, height);
    const bottomScreen = this.projectToScreen(bottomPoint, camera, width, height);
    const screenHeight = Math.abs(bottomScreen.y - topScreen.y);

    // Calculate lighting
    const normal = camera.position.sub(worldPos).normalize();
    const lighting = this.calculateLighting(worldPos, normal, camera, lightManager);
    const litColor = this.applyLightingToColor(baseColor, lighting.diffuse, lighting.ambient);

    const depth = camera.position.distanceTo(worldPos);

    // Render as an ellipse (2D representation of cylinder cross-section)
    items.push({
      depth,
      render: (a) => {
        // Draw the main body as a rectangle with rounded ends
        const points = [
          { x: screenPos.x - screenRadius, y: topScreen.y },
          { x: screenPos.x + screenRadius, y: topScreen.y },
          { x: screenPos.x + screenRadius, y: bottomScreen.y },
          { x: screenPos.x - screenRadius, y: bottomScreen.y },
        ];
        a.canvasPolygon({
          points,
          fillColor: litColor,
          strokeColor: litColor,
          strokeWidth: 0,
        });
      },
    });

    return items;
  }
}

/**
 * Default renderer instance
 */
export const renderer3d = new Renderer3D();
