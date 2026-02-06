/**
 * three.js webgl - points - dynamic
 *
 * Tests:
 * - Dynamic point cloud updates
 * - Particle system simulation
 * - Gravity and physics-like behavior
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPointsDynamicParams {
  width?: number;
  height?: number;
}

export interface WebGLPointsDynamicDemo {
  stop: () => void;
  getTime: () => number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPointsDynamic(
  a: App,
  win: ITsyneWindow,
  params: WebGLPointsDynamicParams = {}
): Promise<WebGLPointsDynamicDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.set(0, 100, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  const particleCount = 5000;
  const particles: Particle[] = [];

  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: 0,
      y: 0,
      z: 0,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 5 + 2,
      vz: (Math.random() - 0.5) * 4,
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
    });
  }

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Add emitter visualization
  const emitterGeometry = new THREE.ConeGeometry(20, 30, 16);
  const emitterMaterial = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true });
  const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
  emitter.rotation.x = Math.PI;
  emitter.position.y = -15;
  scene.add(emitter);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(400, 400, 20, 20);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x222233, wireframe: true });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.position.y = -100;
  scene.add(ground);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  const gravity = -0.1;
  const color = new THREE.Color();

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // Update life
        p.life++;

        // Reset particle if dead
        if (p.life > p.maxLife || p.y < -100) {
          p.x = (Math.random() - 0.5) * 20;
          p.y = 0;
          p.z = (Math.random() - 0.5) * 20;
          p.vx = (Math.random() - 0.5) * 4;
          p.vy = Math.random() * 5 + 2;
          p.vz = (Math.random() - 0.5) * 4;
          p.life = 0;
          p.maxLife = 100 + Math.random() * 100;
        }

        // Apply gravity
        p.vy += gravity;

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Apply drag
        p.vx *= 0.99;
        p.vz *= 0.99;

        // Update buffer
        positionAttr.setXYZ(i, p.x, p.y, p.z);

        // Color based on life and velocity
        const lifeRatio = 1 - p.life / p.maxLife;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
        color.setHSL(0.1 - lifeRatio * 0.1, 1, 0.3 + speed * 0.1);

        colorAttr.setXYZ(i, color.r, color.g, color.b);
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      // Rotate emitter
      emitter.rotation.y = time * 0.5;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
      camera.lookAt(0, 50, 0);

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - points - dynamic' },
    (a) => {
      a.window(
        { title: 'three.js webgl - points - dynamic', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPointsDynamic(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
