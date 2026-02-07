/**
 * three.js webgl - custom particle attributes
 *
 * Port of: three/examples/webgl_buffergeometry_custom_attributes_particles.html
 *
 * Tests:
 * - BufferGeometry with custom attributes
 * - Points with ShaderMaterial
 * - Custom per-particle colors and sizes
 * - Animated size changes
 *
 * Adaptations for Tsyne:
 * - Uses procedural particle generation
 * - Custom shader for particle rendering
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryCustomAttributesParticlesParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLBufferGeometryCustomAttributesParticlesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryCustomAttributesParticles(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryCustomAttributesParticlesParams = {}
): Promise<WebGLBufferGeometryCustomAttributesParticlesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const particleCount = params.particleCount ?? 10000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 10000);
  camera.position.z = 300;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create custom geometry with attributes
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * 200;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 200;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 200;

    color.setHSL(i / particleCount, 1.0, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 10 + Math.random() * 10;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Custom shader material
  const vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    void main() {
      vColor = customColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    void main() {
      float r = length(gl_PointCoord - vec2(0.5));
      if (r > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0 - r * 2.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Animate particle sizes
      const sizeAttr = geometry.getAttribute('size') as any;
      for (let i = 0; i < particleCount; i++) {
        sizeAttr.array[i] = 10 + 5 * Math.sin(time * 2 + i * 0.1);
      }
      sizeAttr.needsUpdate = true;

      particles.rotation.x = time * 0.1;
      particles.rotation.y = time * 0.2;

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
    { title: 'three.js webgl - custom particle attributes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - custom particle attributes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryCustomAttributesParticles(a, win, { width: WIDTH, height: HEIGHT });
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
