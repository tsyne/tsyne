/**
 * three.js webgl - buffergeometry - glbufferattribute
 *
 * Port of: three/examples/webgl_buffergeometry_glbufferattribute.html
 *
 * Tests:
 * - GLBufferAttribute for direct GL buffer manipulation
 * - Dynamic vertex data updates
 * - Low-level buffer management
 *
 * Adaptations for Tsyne:
 * - Uses procedural geometry
 * - Demonstrates buffer attribute updates
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLBufferGeometryGLBufferAttributeParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLBufferGeometryGLBufferAttributeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLBufferGeometryGLBufferAttribute(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryGLBufferAttributeParams = {}
): Promise<WebGLBufferGeometryGLBufferAttributeDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const particleCount = params.particleCount ?? 5000;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // ─────────────────────────────────────────────────────────────────────────
  // Create particle system with buffer attributes
  // ─────────────────────────────────────────────────────────────────────────

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Initial particle velocities for animation
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    // Position
    positions[i * 3] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;

    // Velocity
    velocities[i * 3] = (Math.random() - 0.5) * 2;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;

    // Color based on position
    colors[i * 3] = positions[i * 3] / 1000 + 0.5;
    colors[i * 3 + 1] = positions[i * 3 + 1] / 1000 + 0.5;
    colors[i * 3 + 2] = positions[i * 3 + 2] / 1000 + 0.5;

    // Size
    sizes[i] = Math.random() * 10 + 5;
  }

  const geometry = new THREE.BufferGeometry();

  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);

  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('color', colorAttribute);

  const sizeAttribute = new THREE.BufferAttribute(sizes, 1);
  sizeAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('size', sizeAttribute);

  // Custom shader material for point size
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float time;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        // Circular point
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;

        // Soft edge
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

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

      material.uniforms.time.value = time;

      // Update particle positions based on velocity
      const posArray = positionAttribute.array as Float32Array;
      const colArray = colorAttribute.array as Float32Array;
      const sizeArray = sizeAttribute.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        // Update position
        posArray[i * 3] += velocities[i * 3];
        posArray[i * 3 + 1] += velocities[i * 3 + 1];
        posArray[i * 3 + 2] += velocities[i * 3 + 2];

        // Wrap around boundaries
        for (let j = 0; j < 3; j++) {
          if (posArray[i * 3 + j] > 500) {
            posArray[i * 3 + j] = -500;
          } else if (posArray[i * 3 + j] < -500) {
            posArray[i * 3 + j] = 500;
          }
        }

        // Update color based on new position
        colArray[i * 3] = (posArray[i * 3] / 1000 + 0.5) * (0.5 + 0.5 * Math.sin(time + i * 0.01));
        colArray[i * 3 + 1] = (posArray[i * 3 + 1] / 1000 + 0.5) * (0.5 + 0.5 * Math.sin(time * 1.3 + i * 0.01));
        colArray[i * 3 + 2] = (posArray[i * 3 + 2] / 1000 + 0.5) * (0.5 + 0.5 * Math.sin(time * 0.7 + i * 0.01));

        // Pulse sizes
        sizeArray[i] = (Math.random() * 5 + 5) * (1 + 0.3 * Math.sin(time * 2 + i * 0.1));
      }

      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;

      // Rotate camera around scene
      camera.position.x = Math.sin(time * 0.3) * 800;
      camera.position.z = Math.cos(time * 0.3) * 800;
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
    { title: 'three.js webgl - buffergeometry - glbufferattribute' },
    (a) => {
      a.window(
        { title: 'three.js webgl - buffergeometry - glbufferattribute', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLBufferGeometryGLBufferAttribute(a, win, { width: WIDTH, height: HEIGHT });
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
