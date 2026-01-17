/**
 * Torus Demo App Tests
 *
 * Tests the torus visualization including:
 * - Store state management (replicated locally to avoid DOM deps)
 * - Projection calculations
 * - Wireframe rendering
 * - Shading calculations
 *
 * Note: We replicate the TorusStore class here to avoid importing from
 * torus.ts which pulls in core/src and causes DOM type conflicts.
 */

// ============================================================================
// Replicated Store for testing (avoids core/src import)
// ============================================================================

interface TorusState {
  rotationTheta: number;
  rotationPhi: number;
  rotationPsi: number;
  autoRotate: boolean;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  baseColor: { r: number; g: number; b: number };
}

function createInitialState(): TorusState {
  return {
    rotationTheta: 0.5,
    rotationPhi: 0.3,
    rotationPsi: 0,
    autoRotate: true,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    baseColor: { r: 255, g: 0, b: 0 },
  };
}

const DRAG_SENSITIVITY = 0.01;

class TorusStore {
  private state: TorusState;
  private changeListeners: Array<() => void> = [];

  constructor(initialState?: Partial<TorusState>) {
    this.state = { ...createInitialState(), ...initialState };
  }

  getState(): TorusState {
    return { ...this.state };
  }

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(l => l());
  }

  setRotation(theta: number, phi: number, psi: number): void {
    this.state.rotationTheta = theta;
    this.state.rotationPhi = phi;
    this.state.rotationPsi = psi;
    this.notifyChange();
  }

  incrementRotation(dTheta: number, dPhi: number, dPsi: number): void {
    this.state.rotationTheta += dTheta;
    this.state.rotationPhi += dPhi;
    this.state.rotationPsi += dPsi;
    this.notifyChange();
  }

  toggleAutoRotate(): void {
    this.state.autoRotate = !this.state.autoRotate;
    this.notifyChange();
  }

  setAutoRotate(value: boolean): void {
    this.state.autoRotate = value;
    this.notifyChange();
  }

  resetView(): void {
    this.state.rotationTheta = 0.5;
    this.state.rotationPhi = 0.3;
    this.state.rotationPsi = 0;
    this.notifyChange();
  }

  setBaseColor(color: { r: number; g: number; b: number }): void {
    this.state.baseColor = { ...color };
    this.notifyChange();
  }

  setDragging(isDragging: boolean, mouseX?: number, mouseY?: number): void {
    this.state.isDragging = isDragging;
    if (mouseX !== undefined) this.state.lastMouseX = mouseX;
    if (mouseY !== undefined) this.state.lastMouseY = mouseY;
  }

  handleDrag(mouseX: number, mouseY: number): void {
    if (!this.state.isDragging) return;

    const deltaX = mouseX - this.state.lastMouseX;
    const deltaY = mouseY - this.state.lastMouseY;

    this.state.rotationTheta += deltaX * DRAG_SENSITIVITY;
    this.state.rotationPhi += deltaY * DRAG_SENSITIVITY;
    this.state.lastMouseX = mouseX;
    this.state.lastMouseY = mouseY;

    this.notifyChange();
  }
}

// ============================================================================
// Replicated Pure Math Functions (same as cosyne/src/torus.ts)
// ============================================================================

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface RotationAngles {
  theta: number;
  phi: number;
  psi?: number;
}

interface TorusGeometry {
  majorRadius: number;
  minorRadius: number;
  segmentsU: number;
  segmentsV: number;
}

interface TorusVertex {
  position: Point3D;
  normal: Point3D;
  u: number;
  v: number;
}

interface TorusQuad {
  vertices: [TorusVertex, TorusVertex, TorusVertex, TorusVertex];
  normal: Point3D;
}

class TorusProjection {
  private rotation: RotationAngles = { theta: 0, phi: 0, psi: 0 };
  private center: Point2D = { x: 400, y: 300 };
  private focalLength: number = 320;

  constructor(options?: { focalLength?: number; center?: Point2D }) {
    if (options?.focalLength) this.focalLength = options.focalLength;
    if (options?.center) this.center = options.center;
  }

  project(point: Point3D): Point2D {
    const rotated = this.rotatePoint(point);
    const scale = this.focalLength / (this.focalLength + rotated.z);
    return {
      x: this.center.x + rotated.x * scale,
      y: this.center.y - rotated.y * scale,
    };
  }

  getAlpha(point: Point3D): number {
    const rotated = this.rotatePoint(point);
    if (rotated.z < -this.focalLength) return 0;
    const alpha = Math.max(0, 1 + rotated.z / (this.focalLength * 2));
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

  private rotatePoint(point: Point3D): Point3D {
    let p = { ...point };

    if (this.rotation.theta !== 0) {
      const cos = Math.cos(this.rotation.theta);
      const sin = Math.sin(this.rotation.theta);
      const x = p.x * cos - p.y * sin;
      const y = p.x * sin + p.y * cos;
      p = { ...p, x, y };
    }

    if (this.rotation.phi !== 0) {
      const cos = Math.cos(this.rotation.phi);
      const sin = Math.sin(this.rotation.phi);
      const y = p.y * cos - p.z * sin;
      const z = p.y * sin + p.z * cos;
      p = { ...p, y, z };
    }

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

function generateTorusWireframe(
  majorRadius: number,
  minorRadius: number,
  segmentsU: number,
  segmentsV: number
): Point3D[][] {
  const lines: Point3D[][] = [];

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

function generateTorusMesh(geometry: TorusGeometry): {
  vertices: TorusVertex[];
  quads: TorusQuad[];
} {
  const { majorRadius, minorRadius, segmentsU, segmentsV } = geometry;
  const vertices: TorusVertex[] = [];
  const quads: TorusQuad[] = [];

  for (let i = 0; i <= segmentsU; i++) {
    for (let j = 0; j <= segmentsV; j++) {
      const u = (i / segmentsU) * Math.PI * 2;
      const v = (j / segmentsV) * Math.PI * 2;

      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const r = majorRadius + minorRadius * cosV;
      const x = r * cosU;
      const y = r * sinU;
      const z = minorRadius * sinV;

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

  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const v0_idx = (i * (segmentsV + 1)) + j;
      const v1_idx = (i * (segmentsV + 1)) + (j + 1);
      const v2_idx = ((i + 1) % (segmentsU + 1)) * (segmentsV + 1) + (j + 1);
      const v3_idx = ((i + 1) % (segmentsU + 1)) * (segmentsV + 1) + j;

      const v0 = vertices[v0_idx];
      const v1 = vertices[v1_idx];
      const v2 = vertices[v2_idx % vertices.length];
      const v3 = vertices[v3_idx % vertices.length];

      const faceNormal: Point3D = {
        x: (v0.normal.x + v1.normal.x + v2.normal.x + v3.normal.x) / 4,
        y: (v0.normal.y + v1.normal.y + v2.normal.y + v3.normal.y) / 4,
        z: (v0.normal.z + v1.normal.z + v2.normal.z + v3.normal.z) / 4,
      };

      quads.push({
        vertices: [v0, v1, v2, v3],
        normal: faceNormal,
      });
    }
  }

  return { vertices, quads };
}

function calculateLambertianShade(
  normal: Point3D,
  lightDirection: Point3D,
  ambientIntensity: number = 0.3,
  diffuseIntensity: number = 0.7
): number {
  const normalLength = Math.sqrt(
    normal.x * normal.x + normal.y * normal.y + normal.z * normal.z
  );
  if (normalLength === 0) return ambientIntensity;

  const n = {
    x: normal.x / normalLength,
    y: normal.y / normalLength,
    z: normal.z / normalLength,
  };

  const dotProduct = n.x * lightDirection.x + n.y * lightDirection.y + n.z * lightDirection.z;
  const diffuse = Math.max(0, dotProduct) * diffuseIntensity;
  return ambientIntensity + diffuse;
}

function getDefaultLightDirection(): Point3D {
  const light = { x: 0.5, y: -0.5, z: 1 };
  const length = Math.sqrt(light.x * light.x + light.y * light.y + light.z * light.z);
  return {
    x: light.x / length,
    y: light.y / length,
    z: light.z / length,
  };
}

function colorizeShade(
  shade: number,
  baseColor: { r: number; g: number; b: number }
): string {
  const r = Math.round(baseColor.r * shade);
  const g = Math.round(baseColor.g * shade);
  const b = Math.round(baseColor.b * shade);
  return `rgb(${r},${g},${b})`;
}

function chromostereopsisColor(shade: number, isBackground: boolean = false): string {
  if (isBackground) {
    const blue = Math.round(100 + shade * 155);
    return `rgb(0, 0, ${blue})`;
  } else {
    const red = Math.round(150 + shade * 105);
    return `rgb(${red}, 0, 0)`;
  }
}

function renderTorusWireframe(
  projection: TorusProjection,
  majorRadius: number = 80,
  minorRadius: number = 30,
  segmentsU: number = 20,
  segmentsV: number = 15
): Array<{
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  alpha: number;
}> {
  const wireframe = generateTorusWireframe(majorRadius, minorRadius, segmentsU, segmentsV);
  const lightDir = getDefaultLightDirection();
  const segments: Array<{
    x1: number; y1: number;
    x2: number; y2: number;
    color: string;
    alpha: number;
  }> = [];

  for (const line of wireframe) {
    let prev: Point3D | null = null;

    for (const point of line) {
      const p2d = projection.project(point);
      const alpha = projection.getAlpha(point);

      if (alpha > 0.1) {
        const shade = calculateLambertianShade(point, lightDir, 0.3, 0.7);
        const red = Math.round(100 + shade * 155);
        const color = `rgb(${red}, 0, 0)`;

        if (prev) {
          const prevP2d = projection.project(prev);
          const prevAlpha = projection.getAlpha(prev);

          if (prevAlpha > 0.1) {
            segments.push({
              x1: prevP2d.x,
              y1: prevP2d.y,
              x2: p2d.x,
              y2: p2d.y,
              color,
              alpha: Math.max(prevAlpha, alpha),
            });
          }
        }

        prev = point;
      } else {
        prev = null;
      }
    }
  }

  return segments;
}

// ============================================================================
// Tests
// ============================================================================

describe('TorusStore', () => {
  describe('initial state', () => {
    it('should create store with default initial state', () => {
      const store = new TorusStore();
      const state = store.getState();

      expect(state.rotationTheta).toBe(0.5);
      expect(state.rotationPhi).toBe(0.3);
      expect(state.rotationPsi).toBe(0);
      expect(state.autoRotate).toBe(true);
      expect(state.isDragging).toBe(false);
    });

    it('should accept partial initial state', () => {
      const store = new TorusStore({ rotationTheta: 1.0, autoRotate: false });
      const state = store.getState();

      expect(state.rotationTheta).toBe(1.0);
      expect(state.autoRotate).toBe(false);
      expect(state.rotationPhi).toBe(0.3);
    });
  });

  describe('rotation control', () => {
    it('should set rotation angles', () => {
      const store = new TorusStore();
      store.setRotation(1.0, 2.0, 3.0);

      const state = store.getState();
      expect(state.rotationTheta).toBe(1.0);
      expect(state.rotationPhi).toBe(2.0);
      expect(state.rotationPsi).toBe(3.0);
    });

    it('should increment rotation angles', () => {
      const store = new TorusStore({ rotationTheta: 0, rotationPhi: 0, rotationPsi: 0 });
      store.incrementRotation(0.1, 0.2, 0.3);

      const state = store.getState();
      expect(state.rotationTheta).toBeCloseTo(0.1);
      expect(state.rotationPhi).toBeCloseTo(0.2);
      expect(state.rotationPsi).toBeCloseTo(0.3);
    });

    it('should reset view to defaults', () => {
      const store = new TorusStore();
      store.setRotation(5.0, 5.0, 5.0);
      store.resetView();

      const state = store.getState();
      expect(state.rotationTheta).toBe(0.5);
      expect(state.rotationPhi).toBe(0.3);
      expect(state.rotationPsi).toBe(0);
    });
  });

  describe('auto-rotate', () => {
    it('should toggle auto-rotate', () => {
      const store = new TorusStore({ autoRotate: true });

      store.toggleAutoRotate();
      expect(store.getState().autoRotate).toBe(false);

      store.toggleAutoRotate();
      expect(store.getState().autoRotate).toBe(true);
    });

    it('should set auto-rotate explicitly', () => {
      const store = new TorusStore({ autoRotate: false });

      store.setAutoRotate(true);
      expect(store.getState().autoRotate).toBe(true);

      store.setAutoRotate(false);
      expect(store.getState().autoRotate).toBe(false);
    });
  });

  describe('drag handling', () => {
    it('should update rotation during drag', () => {
      const store = new TorusStore({ rotationTheta: 0, rotationPhi: 0 });

      store.setDragging(true, 100, 100);
      store.handleDrag(150, 120);

      const state = store.getState();
      expect(state.rotationTheta).toBeGreaterThan(0);
      expect(state.rotationPhi).toBeGreaterThan(0);
    });

    it('should not update rotation when not dragging', () => {
      const store = new TorusStore({ rotationTheta: 0, rotationPhi: 0 });

      store.handleDrag(150, 120);

      const state = store.getState();
      expect(state.rotationTheta).toBe(0);
      expect(state.rotationPhi).toBe(0);
    });
  });

  describe('subscriptions', () => {
    it('should notify listeners on state change', () => {
      const store = new TorusStore();
      let notified = false;

      store.subscribe(() => {
        notified = true;
      });

      store.setRotation(1, 1, 1);
      expect(notified).toBe(true);
    });

    it('should allow unsubscribing', () => {
      const store = new TorusStore();
      let count = 0;

      const unsubscribe = store.subscribe(() => {
        count++;
      });

      store.setRotation(1, 1, 1);
      expect(count).toBe(1);

      unsubscribe();
      store.setRotation(2, 2, 2);
      expect(count).toBe(1);
    });
  });

  describe('color', () => {
    it('should set base color', () => {
      const store = new TorusStore();
      store.setBaseColor({ r: 0, g: 255, b: 0 });

      const state = store.getState();
      expect(state.baseColor.r).toBe(0);
      expect(state.baseColor.g).toBe(255);
      expect(state.baseColor.b).toBe(0);
    });
  });
});

describe('TorusProjection', () => {
  describe('basic projection', () => {
    let projection: TorusProjection;

    beforeEach(() => {
      projection = new TorusProjection({
        focalLength: 320,
        center: { x: 400, y: 300 },
      });
    });

    it('should project a point at the origin', () => {
      const point: Point3D = { x: 0, y: 0, z: 0 };
      const projected = projection.project(point);

      expect(projected.x).toBe(400);
      expect(projected.y).toBe(300);
    });

    it('should project points in front of camera with scaling', () => {
      const point: Point3D = { x: 100, y: 0, z: 100 };
      const projected = projection.project(point);

      expect(projected.x).toBeCloseTo(400 + 100 * (320 / 420), 1);
      expect(projected.y).toBe(300);
    });

    it('should flip Y coordinate for canvas coordinates', () => {
      const point: Point3D = { x: 0, y: 100, z: 0 };
      const projected = projection.project(point);

      expect(projected.x).toBe(400);
      expect(projected.y).toBe(200);
    });

    it('should apply rotation before projection', () => {
      projection.setRotation({ theta: Math.PI / 2, phi: 0, psi: 0 });

      const point: Point3D = { x: 100, y: 0, z: 0 };
      const projected = projection.project(point);

      expect(projected.x).toBeCloseTo(400, 1);
      expect(projected.y).toBeCloseTo(200, 1);
    });
  });

  describe('alpha (depth visibility)', () => {
    let projection: TorusProjection;

    beforeEach(() => {
      projection = new TorusProjection({ focalLength: 320 });
    });

    it('should return 1 for points in front of camera', () => {
      const point: Point3D = { x: 0, y: 0, z: 100 };
      expect(projection.getAlpha(point)).toBe(1);
    });

    it('should fade points as they approach back of camera', () => {
      const point: Point3D = { x: 0, y: 0, z: -160 };
      const alpha = projection.getAlpha(point);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);
    });

    it('should return 0 for points behind camera', () => {
      const point: Point3D = { x: 0, y: 0, z: -640 };
      expect(projection.getAlpha(point)).toBe(0);
    });
  });
});

describe('Torus Geometry', () => {
  describe('mesh generation', () => {
    it('should generate valid mesh with basic parameters', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 40,
        segmentsU: 16,
        segmentsV: 12,
      };

      const mesh = generateTorusMesh(geometry);

      expect(mesh.vertices.length).toBeGreaterThan(0);
      expect(mesh.quads.length).toBeGreaterThan(0);
    });

    it('should create vertices with position and normal', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 40,
        segmentsU: 4,
        segmentsV: 3,
      };

      const mesh = generateTorusMesh(geometry);
      const vertex = mesh.vertices[0];

      expect(vertex.position).toHaveProperty('x');
      expect(vertex.position).toHaveProperty('y');
      expect(vertex.position).toHaveProperty('z');
      expect(vertex.normal).toHaveProperty('x');
      expect(vertex.normal).toHaveProperty('y');
      expect(vertex.normal).toHaveProperty('z');
    });

    it('should calculate correct torus parametric positions', () => {
      const geometry: TorusGeometry = {
        majorRadius: 100,
        minorRadius: 50,
        segmentsU: 8,
        segmentsV: 8,
      };

      const mesh = generateTorusMesh(geometry);

      const outerRadius = geometry.majorRadius + geometry.minorRadius;
      const vertex = mesh.vertices[0];

      const dist = Math.sqrt(vertex.position.x * vertex.position.x + vertex.position.y * vertex.position.y);
      expect(dist).toBeCloseTo(outerRadius, 1);
      expect(vertex.position.z).toBeCloseTo(0, 1);
    });
  });

  describe('wireframe generation', () => {
    it('should generate wireframe lines', () => {
      const lines = generateTorusWireframe(100, 40, 12, 8);

      expect(lines.length).toBeGreaterThan(0);
      expect(Array.isArray(lines[0])).toBe(true);
    });

    it('should create lines with 3D points', () => {
      const lines = generateTorusWireframe(100, 40, 4, 4);
      const line = lines[0];
      const point = line[0];

      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
    });

    it('should generate major and minor circle lines', () => {
      const segmentsU = 8;
      const segmentsV = 6;
      const lines = generateTorusWireframe(100, 40, segmentsU, segmentsV);

      expect(lines.length).toBe(segmentsV + segmentsU);
    });
  });
});

describe('Shading Calculations', () => {
  describe('Lambertian shading', () => {
    it('should calculate shade based on surface normal and light direction', () => {
      const normal: Point3D = { x: 0, y: 0, z: 1 };
      const lightDir: Point3D = { x: 0, y: 0, z: 1 };

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      expect(shade).toBeCloseTo(0.3 + 0.7, 1);
    });

    it('should darken when light hits at angle', () => {
      const normal: Point3D = { x: 0, y: 0, z: 1 };
      const lightDir: Point3D = { x: 1, y: 0, z: 0 };

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      expect(shade).toBeCloseTo(0.3, 1);
    });

    it('should apply ambient minimum when normal faces away', () => {
      const normal: Point3D = { x: 0, y: 0, z: -1 };
      const lightDir: Point3D = { x: 0, y: 0, z: 1 };

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      expect(shade).toBeCloseTo(0.3, 1);
    });

    it('should handle zero normal gracefully', () => {
      const normal: Point3D = { x: 0, y: 0, z: 0 };
      const lightDir: Point3D = { x: 0, y: 0, z: 1 };

      const shade = calculateLambertianShade(normal, lightDir, 0.3, 0.7);

      expect(shade).toBe(0.3);
    });
  });

  describe('default light direction', () => {
    it('should return normalized light direction', () => {
      const lightDir = getDefaultLightDirection();

      const length = Math.sqrt(
        lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z
      );

      expect(length).toBeCloseTo(1, 3);
    });
  });
});

describe('Color Functions', () => {
  describe('colorizeShade', () => {
    it('should create darker color at low shade', () => {
      const baseColor = { r: 255, g: 100, b: 50 };
      const darkColor = colorizeShade(0.2, baseColor);
      const lightColor = colorizeShade(0.8, baseColor);

      expect(darkColor).not.toBe(lightColor);
    });

    it('should preserve color proportions', () => {
      const baseColor = { r: 255, g: 0, b: 0 };
      const colored = colorizeShade(0.5, baseColor);

      expect(colored).toMatch(/rgb\(12[78],0,0\)/);
    });
  });

  describe('chromostereopsisColor', () => {
    it('should return red color for main object', () => {
      const color = chromostereopsisColor(0.5, false);

      expect(color).toContain('rgb');
      expect(color).toMatch(/rgb\(\s*\d+,\s*0,\s*0/);
    });

    it('should return blue color for background', () => {
      const color = chromostereopsisColor(0.5, true);

      expect(color).toContain('rgb');
      const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
      if (matches) {
        const [_, r, g, b] = matches.map(Number);
        expect(b).toBeGreaterThan(r);
      }
    });
  });
});

describe('renderTorusWireframe', () => {
  it('should return line segments from projection', () => {
    const projection = new TorusProjection({
      focalLength: 300,
      center: { x: 400, y: 300 },
    });

    projection.setRotation({ theta: 0.5, phi: 0.3, psi: 0 });

    const segments = renderTorusWireframe(projection, 80, 30, 12, 8);

    expect(segments.length).toBeGreaterThan(50);

    for (const seg of segments) {
      expect(seg.x1).toBeGreaterThan(-100);
      expect(seg.x2).toBeGreaterThan(-100);
      expect(seg.y1).toBeGreaterThan(-100);
      expect(seg.y2).toBeGreaterThan(-100);
      expect(seg.alpha).toBeGreaterThan(0);
      expect(seg.alpha).toBeLessThanOrEqual(1);
      expect(seg.color).toMatch(/rgb\(\d+,\s*0,\s*0\)/);
    }
  });

  it('should handle different rotation angles', () => {
    const projection = new TorusProjection({
      focalLength: 300,
      center: { x: 400, y: 300 },
    });

    const rotations = [
      { theta: 0, phi: 0, psi: 0 },
      { theta: Math.PI / 4, phi: Math.PI / 4, psi: 0 },
      { theta: Math.PI, phi: Math.PI / 2, psi: Math.PI / 3 },
    ];

    for (const rot of rotations) {
      projection.setRotation(rot);
      const segments = renderTorusWireframe(projection, 80, 30, 8, 6);

      expect(segments.length).toBeGreaterThan(0);
    }
  });
});

describe('Torus Integration', () => {
  it('should project torus mesh vertices with projection', () => {
    const geometry: TorusGeometry = {
      majorRadius: 100,
      minorRadius: 40,
      segmentsU: 8,
      segmentsV: 6,
    };

    const mesh = generateTorusMesh(geometry);
    const projection = new TorusProjection({
      focalLength: 300,
      center: { x: 400, y: 300 },
    });

    projection.setRotation({ theta: 0.5, phi: 0.3, psi: 0.1 });

    for (const vertex of mesh.vertices) {
      const p2d = projection.project(vertex.position);
      const alpha = projection.getAlpha(vertex.position);

      expect(p2d).toHaveProperty('x');
      expect(p2d).toHaveProperty('y');
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it('should calculate shading for mesh quads', () => {
    const geometry: TorusGeometry = {
      majorRadius: 100,
      minorRadius: 40,
      segmentsU: 8,
      segmentsV: 6,
    };

    const mesh = generateTorusMesh(geometry);
    const lightDir = getDefaultLightDirection();

    for (const quad of mesh.quads) {
      const shade = calculateLambertianShade(quad.normal, lightDir, 0.3, 0.7);

      expect(shade).toBeGreaterThanOrEqual(0);
      expect(shade).toBeLessThanOrEqual(1);
    }
  });
});
