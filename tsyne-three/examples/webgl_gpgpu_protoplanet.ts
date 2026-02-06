/**
 * three.js webgl - gpgpu - protoplanet
 *
 * Port of: three/examples/webgl_gpgpu_protoplanet.html
 *
 * Tests:
 * - Particle-based gravity simulation
 * - N-body physics
 * - Point cloud rendering
 * - Dynamic particle colors based on velocity
 *
 * Adaptations for Tsyne:
 * - CPU-based gravity simulation
 * - Procedural particle system
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGPGPUProtoplanetParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLGPGPUProtoplanetDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGPGPUProtoplanet(
  a: App,
  win: ITsyneWindow,
  params: WebGLGPGPUProtoplanetParams = {}
): Promise<WebGLGPGPUProtoplanetDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const particleCount = params.particleCount ?? 2000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 150;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize particles
  // ─────────────────────────────────────────────────────────────────────────

  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Create a disc of particles
  for (let i = 0; i < particleCount; i++) {
    // Position in a disc with some random scatter
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 80 + 10;
    const heightOffset = (Math.random() - 0.5) * 10;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = heightOffset;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    // Initial velocity - orbital
    const orbitalSpeed = Math.sqrt(50 / radius) * 0.5;
    velocities[i * 3] = -Math.sin(angle) * orbitalSpeed;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
    velocities[i * 3 + 2] = Math.cos(angle) * orbitalSpeed;

    // Color based on initial position
    const hue = (radius / 90) * 0.3 + 0.05; // Orange to yellow
    const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Size
    sizes[i] = Math.random() * 2 + 1;
  }

  // Add a central "sun" particle
  positions[0] = 0;
  positions[1] = 0;
  positions[2] = 0;
  velocities[0] = 0;
  velocities[1] = 0;
  velocities[2] = 0;
  colors[0] = 1;
  colors[1] = 1;
  colors[2] = 0.8;
  sizes[0] = 10;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;

        // Glow effect
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        float glow = exp(-dist * 4.0);
        vec3 finalColor = vColor * (alpha + glow * 0.5);

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Physics constants
  const gravity = 1000;
  const softening = 5;
  const centralMass = 50;
  const damping = 0.999;

  function updatePhysics(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.05);

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    // Update each particle
    for (let i = 1; i < particleCount; i++) {
      const px = posArray[i * 3];
      const py = posArray[i * 3 + 1];
      const pz = posArray[i * 3 + 2];

      // Gravity from central mass
      const dx = -px;
      const dy = -py;
      const dz = -pz;
      const distSq = dx * dx + dy * dy + dz * dz + softening * softening;
      const dist = Math.sqrt(distSq);
      const force = gravity * centralMass / distSq;

      const fx = dx / dist * force;
      const fy = dy / dist * force;
      const fz = dz / dist * force;

      // Update velocity
      velocities[i * 3] += fx * dt;
      velocities[i * 3 + 1] += fy * dt;
      velocities[i * 3 + 2] += fz * dt;

      // Apply damping
      velocities[i * 3] *= damping;
      velocities[i * 3 + 1] *= damping;
      velocities[i * 3 + 2] *= damping;

      // Update position
      posArray[i * 3] += velocities[i * 3] * dt;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      // Update color based on velocity
      const speed = Math.sqrt(
        velocities[i * 3] ** 2 +
        velocities[i * 3 + 1] ** 2 +
        velocities[i * 3 + 2] ** 2
      );
      const hue = Math.min(speed * 0.3, 0.3); // Blue to red based on speed
      const color = new THREE.Color().setHSL(hue, 0.9, 0.5 + speed * 0.1);
      colArray[i * 3] = color.r;
      colArray[i * 3 + 1] = color.g;
      colArray[i * 3 + 2] = color.b;
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

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      const time = currentTime * 0.001;

      // Update physics
      updatePhysics(deltaTime);

      // Slowly orbit camera
      camera.position.x = Math.sin(time * 0.1) * 150;
      camera.position.z = Math.cos(time * 0.1) * 150;
      camera.position.y = Math.sin(time * 0.05) * 50 + 50;
      camera.lookAt(scene.position);

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
    { title: 'three.js webgl - gpgpu - protoplanet' },
    (a) => {
      a.window(
        { title: 'three.js webgl - gpgpu - protoplanet', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGPGPUProtoplanet(a, win, { width: WIDTH, height: HEIGHT });
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
