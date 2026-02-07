/**
 * three.js webgl - lines torus
 *
 * Tests:
 * - Torus-shaped line geometry
 * - Parametric surface curves
 * - Animated rotation and pulsing
 * - Rainbow vertex colors
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesTorusParams {
  width?: number;
  height?: number;
  majorRadius?: number;
  minorRadius?: number;
}

export interface WebGLLinesTorusDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesTorus(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesTorusParams = {}
): Promise<WebGLLinesTorusDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const majorRadius = params.majorRadius ?? 200;
  const minorRadius = params.minorRadius ?? 80;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.z = 600;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  // ─────────────────────────────────────────────────────────────────────────
  // Create torus line geometry
  // ─────────────────────────────────────────────────────────────────────────

  const torusGroup = new THREE.Group();

  // Torus parametric function
  function torusPoint(u: number, v: number, R: number, r: number): THREE.Vector3 {
    const x = (R + r * Math.cos(v)) * Math.cos(u);
    const y = (R + r * Math.cos(v)) * Math.sin(u);
    const z = r * Math.sin(v);
    return new THREE.Vector3(x, y, z);
  }

  // Create meridian lines (going around the tube)
  const meridianCount = 24;
  for (let i = 0; i < meridianCount; i++) {
    const u = (i / meridianCount) * Math.PI * 2;
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    const segments = 48;
    for (let j = 0; j <= segments; j++) {
      const v = (j / segments) * Math.PI * 2;
      const point = torusPoint(u, v, majorRadius, minorRadius);
      positions.push(point.x, point.y, point.z);

      // Rainbow color based on position
      const hue = i / meridianCount;
      color.setHSL(hue, 0.8, 0.5 + 0.3 * Math.sin(v));
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const line = new THREE.Line(geometry, material);
    torusGroup.add(line);
  }

  // Create latitude lines (going around the torus ring)
  const latitudeCount = 32;
  for (let i = 0; i < latitudeCount; i++) {
    const v = (i / latitudeCount) * Math.PI * 2;
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    const segments = 64;
    for (let j = 0; j <= segments; j++) {
      const u = (j / segments) * Math.PI * 2;
      const point = torusPoint(u, v, majorRadius, minorRadius);
      positions.push(point.x, point.y, point.z);

      // Different color scheme for latitude lines
      const hue = 0.5 + i / (latitudeCount * 2);
      const lightness = 0.4 + 0.3 * Math.cos(u * 4);
      color.setHSL(hue, 0.7, lightness);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });

    const line = new THREE.Line(geometry, material);
    torusGroup.add(line);
  }

  // Create spiral lines on the torus surface
  const spiralCount = 8;
  for (let s = 0; s < spiralCount; s++) {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    const turns = 6; // Number of times the spiral goes around
    const segments = 256;
    const phaseOffset = (s / spiralCount) * Math.PI * 2;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const u = t * Math.PI * 2 * turns + phaseOffset;
      const v = t * Math.PI * 2;
      const point = torusPoint(u, v, majorRadius, minorRadius);
      positions.push(point.x, point.y, point.z);

      // Gradient along spiral
      const hue = (s / spiralCount + t) % 1;
      color.setHSL(hue, 1.0, 0.6);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
    });

    const line = new THREE.Line(geometry, material);
    torusGroup.add(line);
  }

  // Create torus knot overlay
  function torusKnotPoint(t: number, p: number, q: number, R: number, r: number): THREE.Vector3 {
    const phi = t * Math.PI * 2;
    const theta = phi * q / p;
    const knotR = R + r * Math.cos(theta);
    return new THREE.Vector3(
      knotR * Math.cos(phi),
      knotR * Math.sin(phi),
      r * Math.sin(theta)
    );
  }

  // Add a (3,2) torus knot
  const knotGeometry = new THREE.BufferGeometry();
  const knotPositions: number[] = [];
  const knotColors: number[] = [];
  const knotColor = new THREE.Color();

  const knotSegments = 512;
  for (let i = 0; i <= knotSegments; i++) {
    const t = i / knotSegments * 3; // 3 to complete the knot
    const point = torusKnotPoint(t, 3, 2, majorRadius * 0.9, minorRadius * 0.9);
    knotPositions.push(point.x, point.y, point.z);

    knotColor.setHSL(t / 3, 1.0, 0.7);
    knotColors.push(knotColor.r, knotColor.g, knotColor.b);
  }

  knotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(knotPositions, 3));
  knotGeometry.setAttribute('color', new THREE.Float32BufferAttribute(knotColors, 3));

  const knotMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const knotLine = new THREE.Line(knotGeometry, knotMaterial);
  torusGroup.add(knotLine);

  scene.add(torusGroup);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Rotate the torus
      torusGroup.rotation.x = time * 0.2;
      torusGroup.rotation.y = time * 0.3;
      torusGroup.rotation.z = Math.sin(time * 0.1) * 0.3;

      // Pulse scale
      const scale = 1 + 0.1 * Math.sin(time * 2);
      torusGroup.scale.setScalar(scale);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 500;
      camera.position.z = Math.cos(time * 0.15) * 500;
      camera.position.y = Math.sin(time * 0.1) * 200;
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
    { title: 'three.js webgl - lines torus' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines torus', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesTorus(a, win, { width: WIDTH, height: HEIGHT });
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
