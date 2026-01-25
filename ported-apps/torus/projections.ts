/**
 * Torus-specific projection for the torus demo
 */

import type { Point3D, Point2D, RotationAngles, Projection } from 'cosyne';

// Re-export types for convenience
export type { Point3D, Point2D, RotationAngles, Projection };

/**
 * Torus projection - projects 3D torus coordinates to 2D screen space
 * Uses perspective projection with 3-axis rotation
 */
export class TorusProjection implements Projection {
  private rotation: RotationAngles = { theta: 0, phi: 0, psi: 0 };
  private center: Point2D = { x: 400, y: 300 };
  private focalLength: number = 320;

  constructor(options?: { focalLength?: number; center?: Point2D }) {
    if (options?.focalLength) {
      this.focalLength = options.focalLength;
    }
    if (options?.center) {
      this.center = options.center;
    }
  }

  project(point: Point3D): Point2D {
    const rotated = this.rotatePoint(point);
    // Perspective projection: objects closer to camera (larger Z) appear larger
    // Camera is at Z = focalLength looking towards -Z
    const scale = this.focalLength / (this.focalLength - rotated.z);
    return {
      x: this.center.x + rotated.x * scale,
      y: this.center.y - rotated.y * scale,
    };
  }

  getAlpha(point: Point3D): number {
    const rotated = this.rotatePoint(point);
    // Points behind the camera (z > focalLength) are invisible
    if (rotated.z > this.focalLength) {
      return 0;
    }
    // Fade points as they approach the back (negative Z = farther away)
    // Full alpha at z=0, fading as z becomes more negative
    const alpha = Math.max(0, (rotated.z + this.focalLength) / (this.focalLength * 2));
    return Math.min(1, alpha);
  }

  setRotation(angles: RotationAngles): void {
    this.rotation = {
      theta: angles.theta,
      phi: angles.phi,
      psi: angles.psi ?? 0,
    };
  }

  getRotation(): RotationAngles {
    return { ...this.rotation };
  }

  getCenter(): Point2D {
    return { ...this.center };
  }

  setCenter(center: Point2D): void {
    this.center = { ...center };
  }

  /**
   * Get the Z coordinate after rotation (for depth sorting)
   */
  getDepth(point: Point3D): number {
    return this.rotatePoint(point).z;
  }

  /**
   * Rotate a point (or normal vector) by current rotation
   */
  rotate(point: Point3D): Point3D {
    return this.rotatePoint(point);
  }

  private rotatePoint(point: Point3D): Point3D {
    let p = { ...point };

    // Rotate around Z axis (theta/yaw)
    if (this.rotation.theta !== 0) {
      const cos = Math.cos(this.rotation.theta);
      const sin = Math.sin(this.rotation.theta);
      const x = p.x * cos - p.y * sin;
      const y = p.x * sin + p.y * cos;
      p = { ...p, x, y };
    }

    // Rotate around X axis (phi/pitch)
    if (this.rotation.phi !== 0) {
      const cos = Math.cos(this.rotation.phi);
      const sin = Math.sin(this.rotation.phi);
      const y = p.y * cos - p.z * sin;
      const z = p.y * sin + p.z * cos;
      p = { ...p, y, z };
    }

    // Rotate around Y axis (psi/roll)
    if (this.rotation.psi) {
      const cos = Math.cos(this.rotation.psi);
      const sin = Math.sin(this.rotation.psi);
      const x = p.x * cos + p.z * sin;
      const z = -p.x * sin + p.z * cos;
      p = { ...p, x, z };
    }

    return p;
  }
}
