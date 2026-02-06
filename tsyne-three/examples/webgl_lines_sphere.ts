/**
 * three.js webgl - lines sphere
 *
 * Port of: three/examples/webgl_lines_sphere.html
 *
 * Tests:
 * - Line geometry forming a sphere
 * - BufferGeometry with dynamic vertex positions
 * - Icosahedron-based sphere subdivision
 * - Camera rotation animation
 *
 * Adaptations for Tsyne:
 * - Uses procedural sphere line generation
 * - No external dependencies
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesSphereParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesSphereDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesSphere(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesSphereParams = {}
): Promise<WebGLLinesSphereDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(80, width / height, 1, 3000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // ─────────────────────────────────────────────────────────────────────────
  // Generate sphere lines using icosahedron subdivision
  // ─────────────────────────────────────────────────────────────────────────

  const radius = 450;
  const lineCount = 1500;

  // Generate random points on sphere surface
  function randomPointOnSphere(r: number): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  // Create great circle arc between two points on sphere
  function createGreatCircleArc(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    r: number,
    segments: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const normal = new THREE.Vector3().crossVectors(p1, p2).normalize();
    const angle = p1.angleTo(p2);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const currentAngle = angle * t;

      // Rotate p1 around the normal axis
      const point = p1.clone().applyAxisAngle(normal, currentAngle).normalize().multiplyScalar(r);
      points.push(point);
    }

    return points;
  }

  // Create multiple sphere line objects
  const sphereLines: THREE.LineSegments[] = [];
  const sphereGroup = new THREE.Group();

  // Create latitude lines
  for (let lat = -80; lat <= 80; lat += 20) {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    const latRad = (lat * Math.PI) / 180;
    const latRadius = radius * Math.cos(latRad);
    const y = radius * Math.sin(latRad);

    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions.push(
        latRadius * Math.cos(theta),
        y,
        latRadius * Math.sin(theta)
      );

      // Color based on latitude
      const hue = 0.6 + (lat + 80) / 320; // Blue to cyan
      color.setHSL(hue, 1.0, 0.5 + Math.abs(lat) / 200);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const line = new THREE.Line(geometry, material);
    sphereGroup.add(line);
  }

  // Create longitude lines
  for (let lon = 0; lon < 360; lon += 15) {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    const lonRad = (lon * Math.PI) / 180;

    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const latRad = ((i / segments) * 180 - 90) * Math.PI / 180;
      positions.push(
        radius * Math.cos(latRad) * Math.cos(lonRad),
        radius * Math.sin(latRad),
        radius * Math.cos(latRad) * Math.sin(lonRad)
      );

      // Color based on longitude
      const hue = lon / 360;
      color.setHSL(hue, 0.8, 0.5);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    });

    const line = new THREE.Line(geometry, material);
    sphereGroup.add(line);
  }

  // Create random great circle arcs
  for (let i = 0; i < 50; i++) {
    const p1 = randomPointOnSphere(radius);
    const p2 = randomPointOnSphere(radius);

    const arcPoints = createGreatCircleArc(p1, p2, radius, 32);

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let j = 0; j < arcPoints.length; j++) {
      const point = arcPoints[j];
      positions.push(point.x, point.y, point.z);

      // Gradient along arc
      const t = j / (arcPoints.length - 1);
      color.setHSL(0.1 + t * 0.3, 1.0, 0.6);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
    });

    const line = new THREE.Line(geometry, material);
    sphereGroup.add(line);
  }

  scene.add(sphereGroup);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate the sphere
      sphereGroup.rotation.y = time * 0.1;
      sphereGroup.rotation.x = Math.sin(time * 0.05) * 0.2;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 1000;
      camera.position.z = Math.cos(time * 0.2) * 1000;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
    getTime: () => currentTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - lines sphere' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines sphere', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesSphere(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ═══════════════════════════════════════════════════════════════════════════
// Entry Point
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  main().catch(console.error);
}
