/**
 * Torus geometry and rendering for Cosyne
 * Generates parametric torus surfaces and provides lighting/shading calculations
 */

import { Point3D } from './projections';

export interface TorusGeometry {
  majorRadius: number;  // Distance from center of torus to center of tube
  minorRadius: number;  // Radius of the tube itself
  segmentsU: number;    // Number of segments around the major circle
  segmentsV: number;    // Number of segments around the minor circle
}

export interface TorusVertex {
  position: Point3D;
  normal: Point3D;      // Surface normal for lighting calculations
  u: number;            // Parameter u (0-1) for position on major circle
  v: number;            // Parameter v (0-1) for position on minor circle
}

export interface TorusQuad {
  vertices: [TorusVertex, TorusVertex, TorusVertex, TorusVertex];
  normal: Point3D;      // Face normal for quick shading
}

export interface TorusEdge {
  v1: TorusVertex;
  v2: TorusVertex;
}

/**
 * Generate a parametric torus mesh
 * @param geometry Configuration for the torus
 * @returns Array of vertices and faces
 */
export function generateTorusMesh(
  geometry: TorusGeometry
): { vertices: TorusVertex[]; quads: TorusQuad[]; edges: TorusEdge[] } {
  const { majorRadius, minorRadius, segmentsU, segmentsV } = geometry;
  const vertices: TorusVertex[] = [];
  const quads: TorusQuad[] = [];
  const edges: TorusEdge[] = [];

  // Generate vertices using parametric equations
  for (let i = 0; i <= segmentsU; i++) {
    for (let j = 0; j <= segmentsV; j++) {
      const u = (i / segmentsU) * Math.PI * 2;
      const v = (j / segmentsV) * Math.PI * 2;

      // Parametric torus equation:
      // x = (majorRadius + minorRadius * cos(v)) * cos(u)
      // y = (majorRadius + minorRadius * cos(v)) * sin(u)
      // z = minorRadius * sin(v)
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const r = majorRadius + minorRadius * cosV;
      const x = r * cosU;
      const y = r * sinU;
      const z = minorRadius * sinV;

      // Calculate surface normal at this point
      // For a torus, the normal points outward from the center
      const normal: Point3D = {
        x: cosV * cosU,
        y: cosV * sinU,
        z: sinV,
      };

      vertices.push({
        position: { x, y, z },
        normal,
        u: i / segmentsU,
        v: j / segmentsV,
      });
    }
  }

  // Create quads from vertices
  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const v0_idx = (i * (segmentsV + 1)) + j;
      const v1_idx = (i * (segmentsV + 1)) + (j + 1);
      const v2_idx = ((i + 1) % (segmentsU + 1)) * (segmentsV + 1) + (j + 1);
      const v3_idx = ((i + 1) % (segmentsU + 1)) * (segmentsV + 1) + j;

      // Handle wrap-around for the seam
      const v0 = vertices[v0_idx];
      const v1 = vertices[v1_idx];
      const v2 = vertices[v2_idx % vertices.length];
      const v3 = vertices[v3_idx % vertices.length];

      // Calculate face normal (average of vertex normals)
      const faceNormal: Point3D = {
        x: (v0.normal.x + v1.normal.x + v2.normal.x + v3.normal.x) / 4,
        y: (v0.normal.y + v1.normal.y + v2.normal.y + v3.normal.y) / 4,
        z: (v0.normal.z + v1.normal.z + v2.normal.z + v3.normal.z) / 4,
      };

      quads.push({
        vertices: [v0, v1, v2, v3],
        normal: faceNormal,
      });

      // Add edges
      edges.push({ v1: v0, v2: v1 });
      edges.push({ v1: v1, v2: v2 });
      edges.push({ v1: v2, v2: v3 });
      edges.push({ v1: v3, v2: v0 });
    }
  }

  return { vertices, quads, edges };
}

/**
 * Calculate Lambertian shading for a point on the torus surface
 * @param normal Surface normal at the point
 * @param lightDirection Direction to the light source (should be normalized)
 * @param ambientIntensity Ambient light (0-1)
 * @param diffuseIntensity Diffuse light (0-1)
 * @returns Shade factor (0-1) where 1 is fully lit
 */
export function calculateLambertianShade(
  normal: Point3D,
  lightDirection: Point3D,
  ambientIntensity: number = 0.3,
  diffuseIntensity: number = 0.7
): number {
  // Normalize the normal vector
  const normalLength = Math.sqrt(
    normal.x * normal.x + normal.y * normal.y + normal.z * normal.z
  );
  if (normalLength === 0) return ambientIntensity;

  const n = {
    x: normal.x / normalLength,
    y: normal.y / normalLength,
    z: normal.z / normalLength,
  };

  // Calculate dot product (cosine of angle between normal and light)
  const dotProduct = n.x * lightDirection.x + n.y * lightDirection.y + n.z * lightDirection.z;

  // Lambertian shading: ambient + diffuse * max(0, dot product)
  const diffuse = Math.max(0, dotProduct) * diffuseIntensity;
  return ambientIntensity + diffuse;
}

/**
 * Get the default light direction (front-right-top)
 */
export function getDefaultLightDirection(): Point3D {
  // Normalized vector pointing from object to light
  // Front: +Z, Right: +X, Top: -Y (canvas coordinates)
  const light = { x: 0.5, y: -0.5, z: 1 };
  const length = Math.sqrt(light.x * light.x + light.y * light.y + light.z * light.z);
  return {
    x: light.x / length,
    y: light.y / length,
    z: light.z / length,
  };
}

/**
 * Generate a wireframe representation of a torus (edges only)
 * Useful for simple, high-performance rendering
 */
export function generateTorusWireframe(
  majorRadius: number,
  minorRadius: number,
  segmentsU: number,
  segmentsV: number
): Point3D[][] {
  const lines: Point3D[][] = [];

  // Major circle lines (around the u direction)
  for (let j = 0; j < segmentsV; j++) {
    const line: Point3D[] = [];
    for (let i = 0; i <= segmentsU; i++) {
      const u = (i / segmentsU) * Math.PI * 2;
      const v = (j / segmentsV) * Math.PI * 2;

      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const r = majorRadius + minorRadius * cosV;
      line.push({
        x: r * cosU,
        y: r * sinU,
        z: minorRadius * sinV,
      });
    }
    lines.push(line);
  }

  // Minor circle lines (around the v direction)
  for (let i = 0; i < segmentsU; i++) {
    const line: Point3D[] = [];
    for (let j = 0; j <= segmentsV; j++) {
      const u = (i / segmentsU) * Math.PI * 2;
      const v = (j / segmentsV) * Math.PI * 2;

      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const r = majorRadius + minorRadius * cosV;
      line.push({
        x: r * cosU,
        y: r * sinU,
        z: minorRadius * sinV,
      });
    }
    lines.push(line);
  }

  return lines;
}

/**
 * Colorize a shade value, creating a gradient from dark to light
 * Useful for creating depth perception
 */
export function colorizeShade(
  shade: number,
  baseColor: { r: number; g: number; b: number }
): string {
  // Multiply RGB by shade value
  const r = Math.round(baseColor.r * shade);
  const g = Math.round(baseColor.g * shade);
  const b = Math.round(baseColor.b * shade);

  return `rgb(${r},${g},${b})`;
}

/**
 * Create a chromostereopsis color pair (red/blue for depth illusion)
 * Returns the color based on depth perception
 */
export function chromostereopsisColor(
  shade: number,
  isBackground: boolean = false
): string {
  if (isBackground) {
    // Blue background plane
    const blue = Math.round(100 + shade * 155);
    return `rgb(0, 0, ${blue})`;
  } else {
    // Red torus
    const red = Math.round(150 + shade * 105);
    return `rgb(${red}, 0, 0)`;
  }
}
