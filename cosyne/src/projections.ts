/**
 * Projection system for Cosyne
 * Transforms 3D coordinates to 2D screen coordinates
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface RotationAngles {
  theta: number; // Yaw (rotation around Z axis)
  phi: number;   // Pitch (rotation around X axis)
  psi?: number;  // Roll (rotation around Y axis)
}

/**
 * Interface for coordinate projection systems
 */
export interface Projection {
  /**
   * Project a 3D point to 2D screen coordinates
   */
  project(point: Point3D): Point2D;

  /**
   * Get the alpha (visibility) value for a point
   * Returns 0-1 where 1 is fully visible
   */
  getAlpha(point: Point3D): number;

  /**
   * Set rotation angles for the projection
   */
  setRotation(angles: RotationAngles): void;

  /**
   * Get current rotation angles
   */
  getRotation(): RotationAngles;

  /**
   * Get canvas center point
   */
  getCenter(): Point2D;

  /**
   * Set canvas center point
   */
  setCenter(center: Point2D): void;
}

/**
 * Spherical projection - projects lat/lon on a sphere to 2D screen
 */
export class SphericalProjection implements Projection {
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
    // Apply rotation to 3D point
    const rotated = this.rotatePoint(point);

    // Project to 2D using perspective projection
    const scale = this.focalLength / (this.focalLength + rotated.z);
    return {
      x: this.center.x + rotated.x * scale,
      y: this.center.y - rotated.y * scale, // Flip Y for canvas coordinates
    };
  }

  getAlpha(point: Point3D): number {
    const rotated = this.rotatePoint(point);
    // Points behind the camera (z < -focalLength) are invisible
    if (rotated.z < -this.focalLength) {
      return 0;
    }
    // Fade points approaching the back
    const alpha = Math.max(0, 1 + rotated.z / (this.focalLength * 2));
    return Math.min(1, alpha);
  }

  setRotation(angles: RotationAngles): void {
    this.rotation = { ...angles };
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
   * Apply rotations to a 3D point
   */
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

/**
 * Isometric projection - projects 3D to 2D isometric view
 */
export class IsometricProjection implements Projection {
  private rotation: RotationAngles = { theta: 0, phi: 0, psi: 0 };
  private center: Point2D = { x: 400, y: 300 };
  private scale: number = 1;

  constructor(options?: { scale?: number; center?: Point2D; angle?: number }) {
    if (options?.scale) {
      this.scale = options.scale;
    }
    if (options?.center) {
      this.center = options.center;
    }
    // Standard isometric angle
    if (options?.angle !== undefined) {
      this.rotation.phi = options.angle;
    }
  }

  project(point: Point3D): Point2D {
    // Isometric projection: simplified for clarity
    // Standard isometric: 30° rotation around X and Z axes
    const angleX = Math.PI / 6; // 30 degrees
    const angleZ = Math.PI / 4; // 45 degrees

    // Apply isometric transformation
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosZ = Math.cos(angleZ);
    const sinZ = Math.sin(angleZ);

    const x1 = point.x * cosZ - point.y * sinZ;
    const y1 = point.x * sinZ + point.y * cosZ;
    const z1 = point.z;

    const x2 = x1;
    const y2 = y1 * cosX - z1 * sinX;

    return {
      x: this.center.x + x2 * this.scale,
      y: this.center.y + y2 * this.scale,
    };
  }

  getAlpha(point: Point3D): number {
    // Isometric doesn't have depth-based visibility
    return 1;
  }

  setRotation(angles: RotationAngles): void {
    this.rotation = { ...angles };
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
}

/**
 * Torus projection - projects 3D torus coordinates to 2D screen space
 * Uses the same rotation system as SphericalProjection
 */
export class TorusProjection implements Projection {
  private rotation: RotationAngles = { theta: 0, phi: 0, psi: 0 }; // Always initialize psi
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
    // Apply rotation to 3D point
    const rotated = this.rotatePoint(point);

    // Project to 2D using perspective projection
    const scale = this.focalLength / (this.focalLength + rotated.z);
    return {
      x: this.center.x + rotated.x * scale,
      y: this.center.y - rotated.y * scale, // Flip Y for canvas coordinates
    };
  }

  getAlpha(point: Point3D): number {
    const rotated = this.rotatePoint(point);
    // Points behind the camera (z < -focalLength) are invisible
    if (rotated.z < -this.focalLength) {
      return 0;
    }
    // Fade points approaching the back
    const alpha = Math.max(0, 1 + rotated.z / (this.focalLength * 2));
    return Math.min(1, alpha);
  }

  setRotation(angles: RotationAngles): void {
    this.rotation = {
      theta: angles.theta,
      phi: angles.phi,
      psi: angles.psi ?? 0 // Ensure psi defaults to 0
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
   * Apply rotations to a 3D point (same as SphericalProjection)
   */
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

/**
 * Graticule - generates lat/lon grid lines on a sphere
 */
export class Graticule {
  /**
   * Generate graticule lines (meridians and parallels)
   */
  static generate(
    latLines: number,
    lonLines: number,
    radius: number = 100,
    projection?: Projection
  ): { meridians: Point3D[][]; parallels: Point3D[][] } {
    const meridians: Point3D[][] = [];
    const parallels: Point3D[][] = [];

    // Meridians (lines of longitude)
    for (let lon = 0; lon < 360; lon += 360 / lonLines) {
      const lonRad = (lon * Math.PI) / 180;
      const line: Point3D[] = [];

      for (let lat = -90; lat <= 90; lat += 10) {
        const latRad = (lat * Math.PI) / 180;
        const x = radius * Math.cos(latRad) * Math.cos(lonRad);
        const y = radius * Math.cos(latRad) * Math.sin(lonRad);
        const z = radius * Math.sin(latRad);
        line.push({ x, y, z });
      }

      meridians.push(line);
    }

    // Parallels (lines of latitude)
    for (let lat = -60; lat <= 60; lat += 90 / latLines) {
      const latRad = (lat * Math.PI) / 180;
      const line: Point3D[] = [];

      for (let lon = 0; lon <= 360; lon += 10) {
        const lonRad = (lon * Math.PI) / 180;
        const x = radius * Math.cos(latRad) * Math.cos(lonRad);
        const y = radius * Math.cos(latRad) * Math.sin(lonRad);
        const z = radius * Math.sin(latRad);
        line.push({ x, y, z });
      }

      parallels.push(line);
    }

    return { meridians, parallels };
  }
}
