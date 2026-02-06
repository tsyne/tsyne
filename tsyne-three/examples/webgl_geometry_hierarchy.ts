/**
 * three.js webgl - geometry - hierarchy
 *
 * Tests:
 * - Object3D hierarchy/parenting
 * - Nested transforms
 * - Group rotations
 * - Solar system style animation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryHierarchyParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryHierarchyDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryHierarchy(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryHierarchyParams = {}
): Promise<WebGLGeometryHierarchyDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.set(0, 200, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  // Create solar system hierarchy
  const solarSystem = new THREE.Group();
  scene.add(solarSystem);

  // Sun
  const sunGeometry = new THREE.IcosahedronGeometry(30, 2);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  solarSystem.add(sun);

  // Earth orbit pivot
  const earthOrbit = new THREE.Object3D();
  solarSystem.add(earthOrbit);

  // Earth
  const earthGeometry = new THREE.IcosahedronGeometry(12, 1);
  const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x4488ff, wireframe: true });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.position.x = 100;
  earthOrbit.add(earth);

  // Moon orbit pivot (child of earth)
  const moonOrbit = new THREE.Object3D();
  moonOrbit.position.x = 100;
  earthOrbit.add(moonOrbit);

  // Moon
  const moonGeometry = new THREE.IcosahedronGeometry(4, 0);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.x = 25;
  moonOrbit.add(moon);

  // Mars orbit
  const marsOrbit = new THREE.Object3D();
  solarSystem.add(marsOrbit);

  const marsGeometry = new THREE.IcosahedronGeometry(8, 1);
  const marsMaterial = new THREE.MeshBasicMaterial({ color: 0xff4400, wireframe: true });
  const mars = new THREE.Mesh(marsGeometry, marsMaterial);
  mars.position.x = 160;
  marsOrbit.add(mars);

  // Mars moons
  const phobosOrbit = new THREE.Object3D();
  phobosOrbit.position.x = 160;
  marsOrbit.add(phobosOrbit);

  const phobos = new THREE.Mesh(
    new THREE.TetrahedronGeometry(2),
    new THREE.MeshBasicMaterial({ color: 0x886644, wireframe: true })
  );
  phobos.position.x = 15;
  phobosOrbit.add(phobos);

  const deimosOrbit = new THREE.Object3D();
  deimosOrbit.position.x = 160;
  marsOrbit.add(deimosOrbit);

  const deimos = new THREE.Mesh(
    new THREE.TetrahedronGeometry(1.5),
    new THREE.MeshBasicMaterial({ color: 0x998877, wireframe: true })
  );
  deimos.position.x = 22;
  deimosOrbit.add(deimos);

  // Jupiter orbit
  const jupiterOrbit = new THREE.Object3D();
  solarSystem.add(jupiterOrbit);

  const jupiterGeometry = new THREE.IcosahedronGeometry(25, 2);
  const jupiterMaterial = new THREE.MeshBasicMaterial({ color: 0xddaa77, wireframe: true });
  const jupiter = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
  jupiter.position.x = 250;
  jupiterOrbit.add(jupiter);

  // Jupiter moons (Galilean)
  const jupiterMoonColors = [0xffaa00, 0xaabbcc, 0x888899, 0x667788];
  const jupiterMoonDistances = [40, 50, 65, 85];
  const jupiterMoonOrbits: THREE.Object3D[] = [];

  for (let i = 0; i < 4; i++) {
    const moonOrbit = new THREE.Object3D();
    moonOrbit.position.x = 250;
    jupiterOrbit.add(moonOrbit);
    jupiterMoonOrbits.push(moonOrbit);

    const moonMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3 + i, 0),
      new THREE.MeshBasicMaterial({ color: jupiterMoonColors[i], wireframe: true })
    );
    moonMesh.position.x = jupiterMoonDistances[i];
    moonOrbit.add(moonMesh);
  }

  // Orbit lines
  const createOrbitLine = (radius: number, color: number) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, opacity: 0.3, transparent: true });
    return new THREE.LineLoop(geometry, material);
  };

  scene.add(createOrbitLine(100, 0x4488ff));
  scene.add(createOrbitLine(160, 0xff4400));
  scene.add(createOrbitLine(250, 0xddaa77));

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

      // Rotate sun
      sun.rotation.y = time * 0.2;

      // Orbit planets
      earthOrbit.rotation.y = time * 0.5;
      moonOrbit.rotation.y = time * 2;

      marsOrbit.rotation.y = time * 0.3;
      phobosOrbit.rotation.y = time * 3;
      deimosOrbit.rotation.y = time * 2;

      jupiterOrbit.rotation.y = time * 0.15;
      for (let i = 0; i < jupiterMoonOrbits.length; i++) {
        jupiterMoonOrbits[i].rotation.y = time * (1.5 - i * 0.3);
      }

      // Planet self-rotation
      earth.rotation.y = time * 2;
      mars.rotation.y = time * 1.8;
      jupiter.rotation.y = time * 3;

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
    { title: 'three.js webgl - geometry - hierarchy' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - hierarchy', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryHierarchy(a, win, { width: WIDTH, height: HEIGHT });
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
