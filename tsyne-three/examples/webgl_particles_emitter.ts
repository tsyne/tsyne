/**
 * three.js webgl - particles emitter
 *
 * Tests:
 * - Particle system with emitter behavior
 * - Point sprite rendering
 * - Particle lifecycle (spawn, move, die)
 * - Vertex colors for particle effects
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLParticlesEmitterParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLParticlesEmitterDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLParticlesEmitter(
  a: App,
  win: ITsyneWindow,
  params: WebGLParticlesEmitterParams = {}
): Promise<WebGLParticlesEmitterDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const particleCount = params.particleCount ?? 2000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  // ─────────────────────────────────────────────────────────────────────────
  // Particle system
  // ─────────────────────────────────────────────────────────────────────────

  interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    size: number;
    color: THREE.Color;
  }

  const particles: Particle[] = [];
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Initialize particles as inactive
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      position: new THREE.Vector3(0, -1000, 0), // Off screen
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 0,
      size: 5,
      color: new THREE.Color(0xffffff),
    });

    positions[i * 3] = 0;
    positions[i * 3 + 1] = -1000;
    positions[i * 3 + 2] = 0;
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 1;
    sizes[i] = 5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 8,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  const pointCloud = new THREE.Points(geometry, material);
  scene.add(pointCloud);

  // Emitter settings
  const emittersCount = 3;
  const emitters: THREE.Vector3[] = [];
  for (let i = 0; i < emittersCount; i++) {
    const angle = (i / emittersCount) * Math.PI * 2;
    emitters.push(new THREE.Vector3(Math.cos(angle) * 100, 0, Math.sin(angle) * 100));
  }

  let nextParticle = 0;

  function emitParticle(emitterPos: THREE.Vector3, emitterColor: THREE.Color) {
    const p = particles[nextParticle];

    // Reset particle
    p.position.copy(emitterPos);
    p.velocity.set(
      (Math.random() - 0.5) * 4,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 4
    );
    p.life = 0;
    p.maxLife = 2 + Math.random() * 2;
    p.size = 5 + Math.random() * 10;
    p.color.copy(emitterColor);

    nextParticle = (nextParticle + 1) % particleCount;
  }

  function updateParticles(deltaTime: number) {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];

      if (p.life < p.maxLife && p.maxLife > 0) {
        // Update physics
        p.velocity.y -= 2 * deltaTime; // Gravity
        p.position.add(p.velocity.clone().multiplyScalar(deltaTime * 60));
        p.life += deltaTime;

        // Update buffers
        posAttr.array[i * 3] = p.position.x;
        posAttr.array[i * 3 + 1] = p.position.y;
        posAttr.array[i * 3 + 2] = p.position.z;

        // Fade color based on life
        const lifeRatio = 1 - p.life / p.maxLife;
        colAttr.array[i * 3] = p.color.r * lifeRatio;
        colAttr.array[i * 3 + 1] = p.color.g * lifeRatio;
        colAttr.array[i * 3 + 2] = p.color.b * lifeRatio;
      } else {
        // Dead particle - move off screen
        posAttr.array[i * 3 + 1] = -1000;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let lastTime = 0;
  let emitAccum = 0;

  const emitterColors = [
    new THREE.Color(0xff4400),
    new THREE.Color(0x00ff44),
    new THREE.Color(0x4400ff),
  ];

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = Math.min((currentTime - lastTime) * 0.001, 0.1);
      lastTime = currentTime;
      const time = currentTime * 0.001;

      // Move emitters
      for (let i = 0; i < emitters.length; i++) {
        const angle = (i / emitters.length) * Math.PI * 2 + time * 0.5;
        emitters[i].x = Math.cos(angle) * 150;
        emitters[i].z = Math.sin(angle) * 150;
        emitters[i].y = Math.sin(time * 2 + i) * 50;
      }

      // Emit particles
      emitAccum += deltaTime;
      while (emitAccum > 0.01) {
        for (let i = 0; i < emitters.length; i++) {
          emitParticle(emitters[i], emitterColors[i]);
        }
        emitAccum -= 0.01;
      }

      // Update particles
      updateParticles(deltaTime);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
      camera.position.y = 100 + Math.sin(time * 0.1) * 50;
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
    { title: 'three.js webgl - particles emitter' },
    (a) => {
      a.window(
        { title: 'three.js webgl - particles emitter', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLParticlesEmitter(a, win, { width: WIDTH, height: HEIGHT });
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
